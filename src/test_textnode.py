from textnode import TextNode, TextType, split_nodes_image, split_nodes_link

from textnode import TextNode, TextType
import unittest
import re

from textnode import TextNode, TextType

class TestTextNode(unittest.TestCase):
    def __eq__(self, other):
        if not isinstance(other, TextNode):
            return False
        return (
            self.text == other.text and
            self.text_type == other.text_type and
            self.url == other.url and
            self.alt == other.alt
        )

    def test_eq(self):
        node = TextNode("This is a text node", TextType.BOLD)
        node2 = TextNode("This is a text node", TextType.BOLD)
        self.assertEqual(node, node2)

    def test_eq_different_text(self):
        node = TextNode("Text One", TextType.BOLD)
        node2 = TextNode("Text Two", TextType.BOLD)
        self.assertNotEqual(node, node2)

    def test_eq_different_text_types(self):
        node = TextNode("Text type", TextType.ITALIC)
        node2 = TextNode("Text type", TextType.BOLD)
        self.assertNotEqual(node, node2)

if __name__ == "__main__":
    unittest.main()

def test_leading_trailing_delimiters():
    node = TextNode("`code`more", TextType.TEXT)
    result = split_nodes_delimiter([node], "`", TextType.CODE)
    expected = [
        TextNode("code", TextType.CODE),
        TextNode("more", TextType.TEXT)
    ]
    assert result == expected

def test_empty_code_segments():
    node = TextNode("Here is `` and ``", TextType.TEXT)
    result = split_nodes_delimiter([node], "`", TextType.CODE)
    expected = [
        TextNode("Here is ", TextType.TEXT),
        TextNode("", TextType.CODE),
        TextNode(" and ", TextType.TEXT),
        TextNode("", TextType.CODE),
    ]
    assert result == expected

def test_starting_with_delimiter():
    node = TextNode("`start` middle", TextType.TEXT)
    result = split_nodes_delimiter([node], "`", TextType.CODE)
    expected = [
        TextNode("start", TextType.CODE),
        TextNode(" middle", TextType.TEXT),
    ]
    assert result == expected

def test_whitespace_in_image(self):
    matches = extract_markdown_images("![  spaced alt  ](  https://url.com/image.png  )")
    self.assertListEqual([("spaced alt", "https://url.com/image.png")], matches)

def test_whitespace_in_link(self):
    matches = extract_markdown_links("[  spaced link  ](  https://url.com/page  )")
    self.assertListEqual([("spaced link", "https://url.com/page")], matches)

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

def split_nodes_link(old_nodes):
    link_pattern = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')
    new_nodes = []
