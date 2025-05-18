from textnode import TextNode, TextType, split_nodes_image, split_nodes_link
import unittest

from htmlnode import HTMLNode, LeafNode
from textnode import TextNode, TextType
from text_to_html import text_node_to_html_node  # Adjust this import path as needed

class TestHTMLNode(unittest.TestCase):
    def test_props_to_html_empty(self):
        node = HTMLNode()
        self.assertEqual(node.props_to_html(), "")
        node = HTMLNode(props={})
        self.assertEqual(node.props_to_html(), "")

    def test_props_to_html_single_prop(self):
        node = HTMLNode(props={"href": "https://example.com"})
        self.assertEqual(node.props_to_html(), ' href="https://example.com"')

    def test_props_to_html_multiple_props(self):
        props = {
            "href": "https://example.com",
            "target": "_blank"
        }
        node = HTMLNode(props=props)
        expected1 = ' href="https://example.com" target="_blank"'
        expected2 = ' target="_blank" href="https://example.com"'
        result = node.props_to_html()
        self.assertTrue(result == expected1 or result == expected2)

    # Add the LeafNode tests inside the class
    def test_leaf_to_html_p(self):
        node = LeafNode("p", "Hello, world!")
        self.assertEqual(node.to_html(), "<p>Hello, world!</p>")

    def test_leaf_to_html_no_tag(self):
        node = LeafNode(None, "Just text")
        self.assertEqual(node.to_html(), "Just text")

    # You might want to add one more test for testing with properties
    def test_leaf_to_html_with_props(self):
            node = LeafNode("a", "Click me!", {"href": "https://example.com"})
            self.assertEqual(node.to_html(), '<a href="https://example.com">Click me!</a>')

    def test_leaf_node_no_value(self):
        with self.assertRaises(ValueError):
            LeafNode("p", None)

    def test_link(self):
        node = TextNode("Click me", TextType.LINK)
        node.url = "https://example.com"
        html_node = text_node_to_html_node(node)
        self.assertEqual(html_node.tag, "a")
        self.assertEqual(html_node.value, "Click me")
        self.assertEqual(html_node.props, {"href": "https://example.com"})

    def test_image(self):
        node = TextNode("Alt text", TextType.IMAGE)
        node.url = "https://example.com/image.png"
        node.alt = "Alt text"
        html_node = text_node_to_html_node(node)
        self.assertEqual(html_node.tag, "img")
        self.assertEqual(html_node.value, "")
        self.assertEqual(html_node.props["src"], "https://example.com/image.png")
        self.assertEqual(html_node.props["alt"], "Alt text")

    def test_bold(self):
        node = TextNode("Bold text", TextType.BOLD)
        html_node = text_node_to_html_node(node)
        self.assertEqual(html_node.tag, "b")
        self.assertEqual(html_node.value, "Bold text")
        self.assertEqual(html_node.props, None)

    def test_italic(self):
        node = TextNode("Italic text", TextType.ITALIC)
        html_node = text_node_to_html_node(node)
        self.assertEqual(html_node.tag, "i")
        self.assertEqual(html_node.value, "Italic text")
        self.assertEqual(html_node.props, None)

    def test_code(self):
        node = TextNode("Code text", TextType.CODE)
        html_node = text_node_to_html_node(node)
        self.assertEqual(html_node.tag, "code")
        self.assertEqual(html_node.value, "Code text")
        self.assertEqual(html_node.props, None)

    def test_invalid_text_type(self):
        node = TextNode("Some text", "not_a_valid_type")
        with self.assertRaises(Exception):
            text_node_to_html_node(node)

class TestSplitNodes(unittest.TestCase):
    def test_split_links(self):
        node = TextNode(
            "Click [Google](https://google.com) or [Bing](https://bing.com)",
            TextType.TEXT,
        )
        result = split_nodes_link([node])
        self.assertListEqual(result, [
            TextNode("Click ", TextType.TEXT),
            TextNode("Google", TextType.LINK, "https://google.com"),
            TextNode(" or ", TextType.TEXT),
            TextNode("Bing", TextType.LINK, "https://bing.com")
        ])

    def test_split_images(self):
        node = TextNode(
            "This is text with an ![image](https://i.imgur.com/zjjcJKZ.png) and another ![second image](https://i.imgur.com/3elNhQu.png)",
            TextType.TEXT,
        )
        result = split_nodes_image([node])
        self.assertListEqual(result, [
            TextNode("This is text with an ", TextType.TEXT),
            TextNode("image", TextType.IMAGE, "https://i.imgur.com/zjjcJKZ.png", "image"),
            TextNode(" and another ", TextType.TEXT),
            TextNode("second image", TextType.IMAGE, "https://i.imgur.com/3elNhQu.png", "second image")
        ])


    def test_mixed_link_image(self):
        node = TextNode(
            "See ![pic](https://img.com/a.png) and visit [site](https://example.com)",
            TextType.TEXT,
        )
        after_images = split_nodes_image([node])
        final_nodes = split_nodes_link(after_images)
        self.assertListEqual(final_nodes, [
            TextNode("See ", TextType.TEXT),
            TextNode("pic", TextType.IMAGE, "https://img.com/a.png", "pic"),
            TextNode(" and visit ", TextType.TEXT),
            TextNode("site", TextType.LINK, "https://example.com")
        ])


    def test_no_match(self):
        node = TextNode("No links or images here.", TextType.TEXT)
        self.assertListEqual(split_nodes_link([node]), [node])
        self.assertListEqual(split_nodes_image([node]), [node])

    def test_multiple_nodes(self):
        nodes = [
            TextNode("First [link](https://a.com)", TextType.TEXT),
            TextNode("Second ![img](https://img.com/b.png)", TextType.TEXT),
        ]
        step1 = split_nodes_image(nodes)
        step2 = split_nodes_link(step1)
        self.assertListEqual(step2, [
            TextNode("First ", TextType.TEXT),
            TextNode("link", TextType.LINK, "https://a.com"),
            TextNode("Second ", TextType.TEXT),
            TextNode("img", TextType.IMAGE, "https://img.com/b.png", "img")

        ])
