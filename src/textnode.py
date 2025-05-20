import re
from enum import Enum, auto
from block_type import BlockType
from htmlnode import HTMLNode, LeafNode, ParentNode


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

def block_to_block_type(block):
    lines = block.splitlines()

    if not lines:
        return BlockType.PARAGRAPH

    # Code block: starts and ends with ```
    if block.startswith("```") and block.endswith("```"):
        return BlockType.CODE

    # Heading: starts with 1–6 # characters followed by a space
    if re.match(r"^#{1,6} ", lines[0]):
        return BlockType.HEADING

    # Quote: every line starts with > (optionally followed by space)
    if all(re.match(r"^>\s?.*", line) and line.strip() for line in lines):
        return BlockType.QUOTE

    # Unordered list: every line starts with "- " and no blank lines
    if all(re.match(r"^- ", line) and line.strip() for line in lines):
        return BlockType.UNORDERED_LIST

    # Ordered list: lines must start with 1. 2. 3. ... sequentially
    for i, line in enumerate(lines, start=1):
        if not re.match(rf"^{i}\. ", line) or not line.strip():
            break
    else:
        return BlockType.ORDERED_LIST

    # Fallback: it's a paragraph
    return BlockType.PARAGRAPH

def text_to_children(text):
    text_nodes = text_to_textnodes(text)
    return [text_node_to_html_node(node) for node in text_nodes]


def code_block_to_node(block):
    return ParentNode(
        "pre",
        [LeafNode("code", block.strip())]
    )


def heading_block_to_node(block):
    # Count the number of # at the beginning
    heading_level = len(block) - len(block.lstrip('#'))
    content = block[heading_level:].strip()
    return ParentNode(f"h{heading_level}", text_to_children(content))


def paragraph_block_to_node(block):
    return ParentNode("p", text_to_children(block))


def quote_block_to_node(block):
    # Remove leading "> " or ">"
    lines = [line.lstrip("> ").strip() for line in block.splitlines()]
    content = " ".join(lines)
    return ParentNode("blockquote", text_to_children(content))


def unordered_list_block_to_node(block):
    lines = [line.lstrip("-*+ ").strip() for line in block.splitlines()]
    children = [ParentNode("li", text_to_children(line)) for line in lines]
    return ParentNode("ul", children)


def ordered_list_block_to_node(block):
    lines = [line.split(".", 1)[1].strip() for line in block.splitlines()]
    children = [ParentNode("li", text_to_children(line)) for line in lines]
    return ParentNode("ol", children)


def block_to_html_node(block):
    block_type = block_to_block_type(block)

    if block_type == BlockType.CODE:
        return code_block_to_node(block)
    elif block_type == BlockType.HEADING:
        return heading_block_to_node(block)
    elif block_type == BlockType.QUOTE:
        return quote_block_to_node(block)
    elif block_type == BlockType.UNORDERED_LIST:
        return unordered_list_block_to_node(block)
    elif block_type == BlockType.ORDERED_LIST:
        return ordered_list_block_to_node(block)
    elif block_type == BlockType.PARAGRAPH:
        return paragraph_block_to_node(block)
    else:
        raise ValueError(f"Unsupported block type: {block_type}")


def markdown_to_html_node(markdown):
    blocks = markdown_to_blocks(markdown)
    children = [block_to_html_node(block) for block in blocks]
    return ParentNode("div", children)

def markdown_to_blocks(markdown):
    markdown = markdown.replace("\r\n", "\n")
    blocks = re.split(r'\n\s*\n', markdown)
    return [block.strip() for block in blocks if block.strip()]
