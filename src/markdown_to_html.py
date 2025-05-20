from textnode import TextType
from htmlnode import HTMLNode, LeafNode, ParentNode
from block_type import BlockType
from textnode import markdown_to_blocks, block_to_block_type, text_to_textnodes

def text_to_children(text):
    text_nodes = text_to_textnodes(text)
    return [text_node_to_html_node(node) for node in text_nodes]

def text_node_to_html_node(text_node):
    # Convert the text node to the corresponding HTML node
    if text_node.text_type == TextType.TEXT or text_node.text_type == "text":
        return LeafNode(None, text_node.text)  # Keep original spaces (don't strip)
    elif text_node.text_type == TextType.BOLD or text_node.text_type == "bold":
        return LeafNode("b", text_node.text)
    elif text_node.text_type == TextType.ITALIC or text_node.text_type == "italic":
        return LeafNode("i", text_node.text)
    elif text_node.text_type == TextType.CODE or text_node.text_type == "code":
        return LeafNode("code", text_node.text)
    elif text_node.text_type == TextType.LINK or text_node.text_type == "link":
        return LeafNode("a", text_node.text, {"href": text_node.url.strip()})  # Keep the text as it is for links
    elif text_node.text_type == TextType.IMAGE or text_node.text_type == "image":
        return LeafNode("img", "", {"src": text_node.url.strip(), "alt": text_node.text.strip()})  # Preserve the URL, but clean the alt text
    else:
        raise ValueError("Unknown text type: " + str(text_node.text_type))


def markdown_to_html_node(markdown):
    blocks = markdown_to_blocks(markdown)
    children = []

    for block in blocks:
        block_type = block_to_block_type(block)

        if block_type == BlockType.PARAGRAPH:
            # For paragraphs, replace \n with spaces to combine internal line breaks into a single space
            block = block.replace("\n", " ")  # Flatten paragraphs with internal newlines
            children.append(ParentNode("p", text_to_children(block)))

        elif block_type == BlockType.HEADING:
            # Heading block should keep the spacing and newlines intact
            heading_level = len(block.split(" ")[0])  # Count leading #
            text = block[heading_level + 1:].strip()  # Remove extra spaces after the '#'
            children.append(ParentNode(f"h{heading_level}", text_to_children(text)))

        elif block_type == BlockType.CODE:
            # Handle code block (including single-line code blocks)
            lines = block.split("\n")
            if len(lines) > 2:
                code_content = "\n".join(lines[1:-1]).strip()  # Strip only the surrounding backticks
            else:
                code_content = lines[0].strip()  # For single-line code blocks
            code_node = LeafNode("code", code_content)
            pre_node = ParentNode("pre", [code_node])
            children.append(pre_node)

        elif block_type == BlockType.QUOTE:
            # Preserve newlines in blockquotes
            quote_text = "\n".join([line.lstrip("> ").strip() for line in block.split("\n")]).strip()
            children.append(ParentNode("blockquote", text_to_children(quote_text)))

        elif block_type == BlockType.UNORDERED_LIST:
            # Preserve list items with their original spaces
            items = block.split("\n")
            li_nodes = [ParentNode("li", text_to_children(item.lstrip("- ").strip())) for item in items if item.strip()]
            children.append(ParentNode("ul", li_nodes))

        elif block_type == BlockType.ORDERED_LIST:
            # Handle ordered list, preserve spaces between list items
            items = block.split("\n")
            li_nodes = [ParentNode("li", text_to_children(item[item.find(".")+1:].strip())) for item in items if item.strip()]
            children.append(ParentNode("ol", li_nodes))

        else:
            raise ValueError(f"Unknown block type: {block_type}")

    return ParentNode("div", children)
