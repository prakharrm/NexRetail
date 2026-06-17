"""
Truncate MobileNetV3-Large ONNX model to output features instead of logits.

MobileNetV3-Large architecture (simplified):
  input → backbone → global_avg_pool → classifier(Linear 960→1000)

The classifier is the last MatMul+Add pair. We want the output of the
global average pool (960-dim feature vector) instead of the 1000-dim logits.

Usage:
  python scripts/convert-to-features.py
"""

import onnx
from onnx import helper, TensorProto
import os
import sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
INPUT_MODEL = os.path.join(MODELS_DIR, 'mobilenetv3.onnx')
OUTPUT_MODEL = os.path.join(MODELS_DIR, 'mobilenetv3_features.onnx')


def find_feature_node(graph):
    """
    Walk backwards from the output to find the node that feeds into
    the final classification linear layer (MatMul or Gemm).
    The input to that node is our feature vector.
    """
    # Get the output node name
    output_name = graph.output[0].name

    # Build a map: output_name -> node
    output_to_node = {}
    for node in graph.node:
        for out in node.output:
            output_to_node[out] = node

    # Walk backwards from logits output
    current = output_name
    visited = []

    while current in output_to_node:
        node = output_to_node[current]
        visited.append((node.op_type, node.name, list(node.input), list(node.output)))

        if node.op_type in ('MatMul', 'Gemm'):
            # The first input to MatMul/Gemm is the feature vector
            feature_name = node.input[0]
            return feature_name, visited

        # Move to the first input
        current = node.input[0]

    return None, visited


def main():
    if not os.path.exists(INPUT_MODEL):
        print(f"Error: Model not found at {INPUT_MODEL}")
        print("Run 'npm run download-model' first.")
        sys.exit(1)

    print(f"Loading model from {INPUT_MODEL}...")
    model = onnx.load(INPUT_MODEL)
    graph = model.graph

    print(f"Original output: {graph.output[0].name}")

    # Find the feature vector node
    feature_name, trace = find_feature_node(graph)

    if feature_name is None:
        print("ERROR: Could not find classification layer.")
        print("Trace (last 5 nodes walked):")
        for t in trace[-5:]:
            print(f"  {t}")
        sys.exit(1)

    print(f"Feature vector node: {feature_name}")
    print(f"Walked through: {[t[0] for t in trace]}")

    # Determine the feature dimension by looking at the tensor shape
    # We need to run shape inference first
    print("Running shape inference...")
    from onnx import shape_inference
    model = shape_inference.infer_shapes(model)
    graph = model.graph

    # Find the shape of the feature tensor
    feature_dim = None
    for vi in graph.value_info:
        if vi.name == feature_name:
            shape = vi.type.tensor_type.shape
            dims = [d.dim_value for d in shape.dim]
            feature_dim = dims[-1]  # Last dimension is the feature size
            print(f"Feature shape: {dims} -> {feature_dim}-dim")
            break

    if feature_dim is None:
        print("Warning: Could not determine feature dimension from shape inference")
        print("Will determine at runtime")

    # Create new output with the feature tensor
    # Remove the old output
    while len(graph.output) > 0:
        graph.output.pop()

    # Add new output
    if feature_dim:
        new_output = helper.make_tensor_value_info(
            feature_name, TensorProto.FLOAT, [1, feature_dim]
        )
    else:
        new_output = helper.make_tensor_value_info(
            feature_name, TensorProto.FLOAT, None
        )
    graph.output.append(new_output)

    # Remove nodes that are no longer needed (after the feature node)
    # Build a set of nodes that contribute to our new output
    needed_outputs = {feature_name}
    needed_nodes = set()

    # BFS backwards from our target output
    queue = [feature_name]
    input_names = {inp.name for inp in graph.input}
    initializer_names = {init.name for init in graph.initializer}

    while queue:
        name = queue.pop(0)
        if name in input_names or name in initializer_names:
            continue
        for i, node in enumerate(graph.node):
            if name in node.output and i not in needed_nodes:
                needed_nodes.add(i)
                for inp in node.input:
                    queue.append(inp)

    # Remove unneeded nodes
    original_count = len(graph.node)
    nodes_to_keep = [graph.node[i] for i in sorted(needed_nodes)]
    while len(graph.node) > 0:
        graph.node.pop()
    for node in nodes_to_keep:
        graph.node.append(node)

    # Remove unneeded initializers (weights)
    needed_initializer_names = set()
    for node in graph.node:
        for inp in node.input:
            if inp in initializer_names:
                needed_initializer_names.add(inp)

    inits_to_keep = [init for init in graph.initializer if init.name in needed_initializer_names]
    while len(graph.initializer) > 0:
        graph.initializer.pop()
    for init in inits_to_keep:
        graph.initializer.append(init)

    removed_nodes = original_count - len(graph.node)
    print(f"Removed {removed_nodes} nodes (kept {len(graph.node)})")

    # Save
    print(f"Saving feature extractor to {OUTPUT_MODEL}...")
    onnx.save(model, OUTPUT_MODEL)

    size_mb = os.path.getsize(OUTPUT_MODEL) / 1024 / 1024
    print(f"Done! Feature extractor model saved ({size_mb:.1f}MB)")
    print(f"Output: {feature_dim or '?'}-dimensional feature vector")


if __name__ == '__main__':
    main()
