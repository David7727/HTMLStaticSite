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

    def __repr__(self):
        return f'TextNode("{self.text}", TextType.{self.text_type.name}' + (
            f', "{self.url}"' if self.url else ''
        ) + ")"

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

def split_nodes_code(old_nodes):
    new_nodes = []
    pattern = r'`([^`]+)`'
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
            code = match.group(1)
            new_nodes.append(TextNode(code, TextType.CODE))
            text = text[match.end():]
    return new_nodes

def split_nodes_bold(old_nodes):
    new_nodes = []
    pattern = r'\*\*([^\*]+)\*\*'
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
            bold = match.group(1)
            new_nodes.append(TextNode(bold, TextType.BOLD))
            text = text[match.end():]
    return new_nodes

def split_nodes_italic(old_nodes):
    new_nodes = []
    pattern = r'_([^_]+)_'
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
            italic = match.group(1)
            new_nodes.append(TextNode(italic, TextType.ITALIC))
            text = text[match.end():]
    return new_nodes

def text_to_textnodes(text):
    nodes = [TextNode(text, TextType.TEXT)]
    nodes = split_nodes_code(nodes)
    nodes = split_nodes_bold(nodes)
    nodes = split_nodes_italic(nodes)
    nodes = split_nodes_image(nodes)
    nodes = split_nodes_link(nodes)
    return nodes

import unittest

class TestMarkdownFunctions(unittest.TestCase):

    def test_markdown_to_blocks(self):
        md = """
This is **bolded** paragraph

This is another paragraph with _italic_ text and `code` here
This is the same paragraph on a new line

- This is a list
- with items


"""

        blocks = markdown_to_blocks(md)
        self.assertEqual(
            blocks,
            [
                "This is **bolded** paragraph",
                "This is another paragraph with _italic_ text and `code` here\nThis is the same paragraph on a new line",
                "- This is a list\n- with items",
            ],
        )

    def test_multiple_blank_lines_between_blocks(self):
        md = "Block 1\n\n\n\nBlock 2"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

    def test_leading_trailing_blank_lines(self):
        md = "\n\nBlock 1\n\nBlock 2\n\n"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

    def test_empty_string(self):
        md = "\n\n"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, [])

    def test_single_block(self):
        md = "Single block"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Single block"])

    def test_single_blank_line_in_paragraph(self):
        md = "This is a paragraph\nthat has a blank line\nwithin it."
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["This is a paragraph\nthat has a blank line\nwithin it."])

    def test_blank_lines_with_spaces(self):
        md = "Paragraph one.\n\n  \nParagraph two."
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Paragraph one.", "Paragraph two."])

    def test_windows_line_endings(self):
        md = "Block 1\r\n\r\nBlock 2"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

# Run the test
if __name__ == "__main__":
    unittest.main()
