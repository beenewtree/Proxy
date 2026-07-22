"""将 prpr.yaml 的 rules 同步到 diy.yaml
使用方法：订阅更新后，运行 python sync_rules.py
自定义规则保留在最前面，不会被覆盖
"""
import re

PRPR = r"d:\github\Proxy\openclash\prpr.yaml"
DIY = r"d:\github\Proxy\openclash\diy.yaml"

# 1. 提取 prpr.yaml 的 rules
with open(PRPR, encoding="utf-8") as f:
    lines = f.readlines()

in_rules = False
rules = []
for line in lines:
    stripped = line.strip()
    if stripped == "rules:":
        in_rules = True
        continue
    if in_rules:
        if not stripped:
            continue
        if re.match(r"^[a-z]", stripped):
            break
        rules.append(stripped)

# 2. 保留 diy.yaml 中的自定义规则
with open(DIY, encoding="utf-8") as f:
    diy_content = f.read()

custom_rules = []
in_custom = False
for line in diy_content.split("\n"):
    if "# --- 自定义规则" in line:
        in_custom = True
        continue
    if in_custom:
        if line.strip().startswith("# --- 国内") or line.strip().startswith("#  --- 国内"):
            break
        if line.strip().startswith("- ") and not line.strip().startswith("#"):
            custom_rules.append(line.strip())

# 3. 构建新内容
header = """# ============================================================
# 规则 - 自定义规则优先 + prpr 订阅规则
# ============================================================
rules:

  # --- 自定义规则（优先生效）------------------------------
  # 格式：- DOMAIN-SUFFIX,域名,策略组名
  # 需要追加规则时直接加在这里，改一处所有设备同步

"""

# 4. 替换
marker = "# 规则"
idx = diy_content.find(marker)
if idx > 0:
    start = diy_content.rfind("\n", 0, idx) + 1
    new_body = header
    for r in custom_rules:
        new_body += "  " + r + "\n"
    new_body += "\n"
    for r in rules:
        new_body += "  " + r + "\n"
    new_content = diy_content[:start] + new_body
    with open(DIY, "w", encoding="utf-8") as f:
        f.write(new_content)
    rule_count = len([r for r in rules if not r.startswith("#")])
    print(f"✅ 同步完成！{rule_count} 条 prpr 规则已合并到 diy.yaml")
    print(f"   自定义规则 {len(custom_rules)} 条已保留在最前面")
else:
    print("❌ 未找到标记")
