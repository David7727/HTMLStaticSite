import unittest

from textnode import TextNode, TextType

class TestTextNode(unittest.TestCase):
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
