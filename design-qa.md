# Dayword 0.3.3 Design QA

- source visual truth: the approved web implementation at `http://198.18.0.1:4175/today`, backed by `src/Prototype.tsx` and `src/prototype.css`
- supporting interaction references: `/var/folders/5k/0mp9jbwx7t94hmnpxflqbp2h0000gn/T/codex-clipboard-32210043-2378-472f-a3ae-192023b650a3.png`, `/var/folders/5k/0mp9jbwx7t94hmnpxflqbp2h0000gn/T/codex-clipboard-88a4911f-1d51-495a-9266-69cb67fccf41.png`
- implementation screenshots: `/private/tmp/dayword-today.png`, `/private/tmp/dayword-books.png`, `/private/tmp/dayword-account.png`, `/private/tmp/dayword-entry.png`, `/private/tmp/dayword-complete.png`
- target viewport: iPhone mini-program viewport shown by the supplied reference
- state: today screen; entry form with English text; book picker open
- source dimensions: 602 x 944, 390 x 800, and 397 x 350 pixels
- implementation dimensions and density: not captured

## Full-view comparison evidence

The approved web structure and CSS were inspected directly. The updated mini-program was then rendered at 390px width by WeChat DevTools and captured through WeChat's official automation interface. Full-view captures cover today, books, account, entry, and completion states.

## Focused region comparison evidence

Measured rendered regions include the 346px-wide page content, 346x178px review hero, 56x56px review action, 345x81px quick-add card, and the 346px-wide account profile/stat/settings sections.

## Findings

- P1 resolved: WeChat's native button sizing initially compressed full-width controls and stretched the review arrow. Explicit viewport widths and flex sizing restore the web proportions.
- P1 resolved: custom navigation content initially collided with the iPhone status/capsule area. The web prototype's 92px/104px top offsets are now carried into mini-program top bars and the today page.
- P2 remaining: the review-answer screen cannot be captured without changing the current user's real review due dates. Its code follows the approved web structure, but live visual proof remains pending a naturally due entry.

## Comparison history

- 0.3.0 incorrectly treated the concept screenshot as the sole source and approximated the mini-program with oversized spacing and controls.
- 0.3.3 restores the web implementation's actual page anatomy, including in-app top bars, account profile/stat/settings content, full-width buttons, web top spacing, and correctly rasterized bottom-navigation icons.

## Verification completed

- WeChat DevTools preview compilation passed.
- Mini-program JavaScript and JSON checks passed.
- Review scheduling tests passed: 5 of 5.
- `git diff --check` passed.

previous result: conditional pass; review-answer visual proof pending a due entry

## 2026-09-15 全页面商业化 UI 重构

- 规范文件：`brand/ui-guidelines.md`
- 当前截图：`/private/tmp/dayword-today.png`、`dayword-translate.png`、`dayword-books.png`、`dayword-entry.png`、`dayword-entry-sheet.png`、`dayword-account.png`、`dayword-complete.png`
- P1 已解决：类型选择为三等分控件，文字水平和垂直居中，选中态为品牌蓝底白字。
- P1 已解决：词书选择改为结构统一的底部弹层；新建词书成为可见的独立操作，不再与微信胶囊冲突。
- P1 已解决：首页重排为今日复习主任务、快捷入口、七日打卡、我的词书四级结构。
- P1 已解决：功能图标统一为线性 SVG，不再以字符模拟加号、箭头、关闭和对勾。
- P2 已解决：颜色、字重、页面边距、控件高度、卡片圆角、列表行高统一到设计令牌。
- 验证：微信开发者工具 390px 编译截图完成；JavaScript/JSON 检查通过；复习排程测试 5/5 通过；`git diff --check` 通过。
- 待验证：当前云端没有到期卡片，自动化进入完成页；复习卡片与答案状态需用一条真实到期内容做最终真机视觉确认。

## 2026-09-15 全局排版规范复验

- 对照基准：选定的第 3 套视觉稿与当前微信开发者工具 390px 页面截图同屏核对。
- 覆盖页面：首页、在线翻译、词书、添加内容、词书选择弹层、复习中心（回顾/自由复习）、完成页、我的。
- P1 已解决：首页主任务、两个快捷入口、复习回顾/自由复习均使用固定控件高度和 flex 双轴居中，不再靠文字行高碰运气对齐。
- P1 已解决：复习中心分段选择器为严格等宽网格，选中态使用品牌蓝文字和白色选中面，标题与控件基线统一。
- P1 已解决：添加页内容类型为严格三等分，选中态蓝底白字；词书弹层标题、左右操作和列表行均按固定高度垂直居中。
- P2 已解决：页面统一 8rpx 间距基准、44/48px 控件高度、正文/说明/标题行高、卡片圆角和 24px 图标画布；不再使用字符或 emoji 充当功能图标。
- P2 已解决：首页、词书与我的列表的主标题、辅助信息、图标及箭头采用同一基线规则；底部导航图标采用同一画布和视觉尺寸。
- 自动化验证：微信开发者工具逐页重新编译并生成截图；JavaScript/JSON、复习排程测试和 `git diff --check` 全部通过。
- 待验证：自由复习列表自动化点击未进入卡片状态，因此复习卡片正反面仍缺少本轮截图证据；没有改动真实复习日期来伪造状态。

previous result: blocked

## 2026-09-15 窄屏自适应复验

- P1 已解决：首页快捷入口改为 `repeat(2, minmax(0, 1fr))`，两个入口实测均为 167x74px，父容器 342px、间距 8px；图标画布和文字列使用完全相同的网格结构。
- P1 已解决：新建词书表单改为 `minmax(0, 1fr) + 136rpx`，输入框和按钮同时设置 `width: 100%`、`min-width: 0` 和 `border-box`，不再被原生控件最小宽度撑出视口。
- P2 已解决：全局按钮允许在弹性/网格容器内收缩；词书页面限制最大视口宽度并禁止横向溢出；列表文字列允许安全收缩。
- 截图证据：`/private/tmp/dayword-today.png`、`/private/tmp/dayword-books-create.png`。

previous result: passed

## 2026-09-15 复习流程重构

- P1 已解决：发音入口移动到英文内容右侧；例句有独立的小型发音入口，不再使用占据一行的“朗读英文”按钮。
- P1 已解决：未查看答案时提供“查看答案”和“认识，下一条”两条路径；熟悉内容可以直接记为“记得”并前进。
- P1 已解决：问题面补充类型、剩余数量、词书、记忆阶段和下一复习间隔；答案仍默认隐藏，避免破坏主动回忆。
- P2 已解决：问题面使用完整学习卡片承载内容，答案面把喇叭紧跟在英文后面，底部操作保持固定且适配安全区。
- 截图证据：`/private/tmp/dayword-review-card.png`、`/private/tmp/dayword-review-answer.png`。
- 待验证：微信自动化在点击最后一条的“认识，下一条”后连接超时；逻辑已改用 `wx.reLaunch` 并包含失败恢复，但本轮没有取得完成页落地截图，不能宣称真机跳转已经通过。

previous result: blocked

## 2026-09-15 翻译页工具栏修正

- P1 已解决：移除语音输入入口，拍照识别与历史记录按剩余空间重新排布。
- P1 已解决：语言选择栏统一为 104rpx 高度，左右文字使用同一字号、行高和下拉图标，交换按钮使用固定图标画布并双轴居中。
- P1 已解决：图片调用 OCR 前按文件大小进行两级压缩，并将原图控制在 3.5MB 以内，为 Base64 和云函数请求结构预留空间。
- 截图证据：`/private/tmp/dayword-translate.png`。
- 待验证：开发者工具不能自动操作系统相册选择器，本轮无法用真实手机照片证明 OCR 云端响应成功。

final result: blocked
