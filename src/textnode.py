import re
from enum import Enum

class TextType(Enum):
    TEXT = "text"
    BOLD = "bold"
    ITALIC = "italic"
    CODE = "code"
    LINK = "link"
    IMAGE = "image"

class TextNode:
    def __init__(self, text, text_type, url=None, alt=None):
        self.text = text
        self.text_type = text_type
        self.url = url
        self.alt = alt

    def __eq__(self, other):
        return (
            isinstance(other, TextNode)
            and self.text == other.text
            and self.text_type == other.text_type
            and self.url == other.url
            and self.alt == other.alt
        )

def split_nodes_image(old_nodes):
    new_nodes = []
    pattern = r'!\[([^\]]+)\]\((https?://[^\)]+)\)'
    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue

        text = node.text
        while True:
            match = re.search(pattern, text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break

            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))
            alt_text, url = match.groups()
            new_nodes.append(TextNode(alt_text.strip(), TextType.IMAGE, url.strip(), alt_text.strip()))

            text = text[match.end():]
    return new_nodes

def split_nodes_link(old_nodes):
    new_nodes = []
    pattern = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue

        text = node.text
        while True:
            match = re.search(pattern, text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break

            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))
            link_text, url = match.groups()
            new_nodes.append(TextNode(link_text.strip(), TextType.LINK, url.strip()))
            text = text[match.end():]
    return new_nodes
