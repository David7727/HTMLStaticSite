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
