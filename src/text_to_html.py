from textnode import TextNode, TextType
from htmlnode import LeafNode

def text_node_to_html_node(text_node):
    text_type = text_node.text_type

    if text_type == TextType.TEXT:
        return LeafNode(tag=None, value=text_node.text)
    elif text_type == TextType.BOLD:
        return LeafNode(tag="b", value=text_node.text)
    elif text_type == TextType.ITALIC:
        return LeafNode(tag="i", value=text_node.text)
    elif text_type == TextType.CODE:
        return LeafNode(tag="code", value=text_node.text)
    elif text_type == TextType.LINK:
        props = {"href": text_node.url} if text_node.url else {}
        return LeafNode(tag="a", value=text_node.text, props=props)
    elif text_type == TextType.IMAGE:
        props = {}
        if text_node.url:
            props["src"] = text_node.url
        if text_node.alt:
            props["alt"] = text_node.alt
        return LeafNode(tag="img", value="", props=props)
    else:
        raise ValueError(f"Unsupported TextType: {text_type}")
