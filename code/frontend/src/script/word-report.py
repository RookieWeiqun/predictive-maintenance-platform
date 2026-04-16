import base64
import io
from docxtpl import DocxTemplate

# 获取输入数据
item_data = _items[0]
template_binary=_items[1]["binary"]["data"]
template_data = template_binary["data"]
template_bytes = base64.b64decode(template_data)
# print(item_data)
# 安全获取partNo
try:
    data = item_data["json"]
    print(data)
except KeyError:
    # 如果partNo不存在，返回调试信息
    return [{
        "json": {
            "status": "error",
            "error": "请检查数据格式"
        }
    }]

# 3. 填充模板
doc_stream = io.BytesIO(template_bytes)
tpl = DocxTemplate(doc_stream)
tpl.render(data)

# 4. 保存并转换为base64
output_stream = io.BytesIO()
tpl.save(output_stream)
output_stream.seek(0)
output_base64 = base64.b64encode(output_stream.read()).decode('utf-8')
# print(output_base64)
# 5. 返回结果
return [{
    "json": {
        "data": data,
        "status": "success"
    },
    "binary": {
        "data": {
            "data": output_base64,
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "fileName": "output.docx"
        }
    }
}]