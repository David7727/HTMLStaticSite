from enum import Enum
from dataclasses import dataclass
import re

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

        node = TextNode("Click me", TextType.LINK)
        node.url = "https://example.com"

    def __repr__(self):
        return f"TextNode({self.text}, {self.text_type})"

class HTMLNode:
    def __init__(self, tag=None, value=None, children=None, props=None):
        self.tag = tag
        self.value = value
        self.children = children
        self.props = props

    def to_html(self):
        raise NotImplementedError()

    def props_to_html(self):
        if not self.props:
            return ""
        result = ""
        for key, value in self.props.items():
            result += f' {key}="{value}"'
        return result

    def __repr__(self):
        return f"HTMLNode({self.tag}, {self.value}, {self.children}, {self.props})"

class LeafNode(HTMLNode):
    def __init__(self, tag=None, value=None, props=None):
        super().__init__(tag=tag, value=value, children=None, props=props)
        if value is None:
            raise ValueError("Value cannot be empty.")

    def to_html(self):
        if self.value is None:
            raise ValueError("Value cannot be empty.")
        elif self.tag is None:
            return self.value
        else:
            return f"<{self.tag}{self.props_to_html()}>{self.value}</{self.tag}>"

class ParentNode(HTMLNode):
    def __init__(self, tag, children, props=None):
        super().__init__(props=props, tag = tag, children = children)

    def to_html(self):
        if self.tag is None:
            raise ValueError("Tag must be specified")
        if not self.children:
            raise ValueError("Children must be provided for ParentNode")

        content = ""
        for child in self.children:
            content += child.to_html()
        return f"<{self.tag}{self.props_to_html()}>{content}</{self.tag}>"

def test_text(self):
    node = TextNode("This is a text node", TextType.TEXT)
    html_node = text_node_to_html_node(node)
    self.assertEqual(html_node.tag, None)
    self.assertEqual(html_node.value, "This is a text node")

def split_nodes_link(old_nodes):
    link_pattern = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')
    new_nodes = []

    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue

        text = node.text
        while True:
            match = link_pattern.search(text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break

            # Add text before the link
            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))

            # Add the link node
            link_text = match.group(1)
            url = match.group(2)
            new_nodes.append(TextNode(link_text, TextType.LINK, url))

            # Update text to remaining part
            text = text[match.end():]

    return new_nodes


def split_nodes_image(old_nodes):
    image_pattern = re.compile(r'!\[([^\]]+)\]\((https?://[^\)]+)\)')
    new_nodes = []

    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue

        text = node.text
        while True:
            match = image_pattern.search(text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break

            # Add text before the image
            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))

            # Add the image node
            alt_text = match.group(1)
            url = match.group(2)
            new_nodes.append(TextNode(alt_text, TextType.IMAGE, url))

            # Update the text to the remaining part after the match
            text = text[match.end():]

    return new_nodes
