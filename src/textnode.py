from enum import Enum

class TextType(Enum):
    TEXT = "text"
    BOLD = "bold"
    ITALIC = "italic"
    CODE = "code"
    LINK = "link"
    IMAGE = "image"

class TextNode:
    def __init__(self, text, text_type, url=None):
        self.text = text
        self.text_type = text_type
        self.url = url

    def __eg__(self, other):
        return (
            self.text == other.text
            and self.text_type == other.text_type
            and self.url == other.url
        )

    def __repr__(self):
        return f"TextNode({self.text},{self.text_type.value}, {self.url})"

    def __eq__(self, other):
        # First check if 'other' is also a TextNode
        if not isinstance(other, TextNode):
            return False
        # Then compare the relevant attributes
        return (self.text == other.text and
                self.text_type == other.text_type and
                self.url == other.url)

def split_nodes_delimiter(old_nodes, delimiter, text_type):
    new_nodes = []

    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue

        parts = node.text.split(delimiter)

        if len(parts) % 2 == 0:
            raise Exception(f"Invalid Markdown syntax: unmatched delimiter '{delimiter}' in '{node.text}'")

        for i, part in enumerate(parts):
            is_formatted = i % 2 == 1
            part_type = text_type if is_formatted else TextType.TEXT

            if part == "":
                # Only include empty segments if they are formatted
                # or they are not at start or end
                is_first = i == 0
                is_last = i == len(parts) - 1
                if is_formatted or (not is_first and not is_last):
                    new_nodes.append(TextNode(part, part_type))
                continue

            new_nodes.append(TextNode(part, part_type))

    return new_nodes
