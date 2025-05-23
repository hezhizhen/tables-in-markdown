#!/usr/bin/env bash

# 使用 yt-dlp 获取 bilibili 视频信息并添加到 CSV 文件的脚本
# 使用方法: ./add_bilibili.sh <视频URL> [标签]

# 启用调试日志函数
log_info() {
    echo "[INFO] $1"
}

log_debug() {
    echo "[DEBUG] $1"
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_success() {
    echo "[SUCCESS] $1"
}

# 记录脚本开始执行
log_info "脚本开始执行于 $(date '+%Y-%m-%d %H:%M:%S')"

# 步骤 1: 读取 URL
if [ $# -lt 1 ]; then
    log_error "用法: ./add_bilibili.sh <bilibili视频URL> [标签]"
    exit 1
fi

url="$1"
tags=""

log_info "处理视频链接: $url"

# 如果提供了标签
if [ $# -gt 1 ]; then
    tags="$2"
    log_debug "提供了标签: $tags"
else
    log_debug "未提供标签"
fi

# 验证 URL 是否为 bilibili 视频链接
if [[ ! "$url" =~ bilibili\.com/video/ ]]; then
    log_error "错误: URL 必须是 bilibili.com/video/ 格式"
    exit 1
fi

log_debug "URL 格式验证通过"

# 检查 yt-dlp 是否安装
if ! command -v yt-dlp &>/dev/null; then
    log_error "yt-dlp 未安装。请先安装 yt-dlp: brew install yt-dlp"
    exit 1
fi

log_debug "yt-dlp 已安装"

# 步骤 2: 使用 yt-dlp 获取视频信息
log_info "使用 yt-dlp 获取页面信息..."

# 获取标题
log_debug "执行 yt-dlp --get-title \"$url\""
title=$(yt-dlp --get-title "$url" 2>&1)
yt_dlp_title_status=$?

log_debug "yt-dlp 获取标题状态: $yt_dlp_title_status"
log_debug "yt-dlp 原始标题输出: $title"

if [ $yt_dlp_title_status -ne 0 ]; then
    log_error "yt-dlp 获取标题失败: $title"
    exit 1
fi

# 移除标题中可能存在的 ANSI 转义序列 (虽然 yt-dlp 通常不输出这个，但以防万一)
title=$(echo "$title" | sed $'s/\x1b\\[[0-9;]*m//g')
log_success "成功获取标题: $title"

# 获取上传日期 (格式 YYYYMMDD)
log_debug "执行 yt-dlp --print upload_date \"$url\""
upload_date_raw=$(yt-dlp --print upload_date "$url" 2>&1)
yt_dlp_date_status=$?

log_debug "yt-dlp 获取日期状态: $yt_dlp_date_status"
log_debug "yt-dlp 原始日期输出: $upload_date_raw"

if [ $yt_dlp_date_status -ne 0 ]; then
    log_error "yt-dlp 获取上传日期失败: $upload_date_raw"
    # 如果获取日期失败，可以将 uploaded 设为空字符串或采取其他错误处理
    uploaded=""
    log_debug "上传日期获取失败，设置为空"
else
    if [[ "$upload_date_raw" == "NA" || -z "$upload_date_raw" ]]; then
        uploaded=""
        log_debug "上传日期为 NA 或空，设置为空"
    else
        # 格式化日期 YYYYMMDD -> YYYY-MM-DD
        year=${upload_date_raw:0:4}
        month=${upload_date_raw:4:2}
        day=${upload_date_raw:6:2}
        uploaded="$year-$month-$day"
        log_success "成功获取并格式化上传日期: $uploaded"
    fi
fi

# 用户提供的标签 (来自脚本开头的命令行参数 $2) 会被使用
# 如果用户未提供标签，则 tags 变量将保持为空

# 显示获取到的信息
log_info "获取到的视频信息:"
log_info "标题: $title"
log_info "上传日期: $uploaded"
log_info "标签: $tags"

# 步骤 3: 生成CSV格式并写入文件
log_info "开始生成CSV格式并写入文件..."

# 处理标题中可能包含的逗号，确保CSV格式正确
csv_line="\"$title\",$url,$uploaded,$tags"
log_debug "生成的CSV行: $csv_line"

# 检查bilibili.csv文件是否存在
if [ ! -f "bilibili.csv" ]; then
    log_debug "bilibili.csv不存在，创建新文件并添加标题行"
    echo "Title,URL,Uploaded,Tags" >bilibili.csv
fi

# 写入到bilibili.csv文件的末尾
log_debug "写入数据到 bilibili.csv"
echo "$csv_line" >>bilibili.csv
write_status=$?

if [ $write_status -eq 0 ]; then
    log_success "✅ 成功添加到 bilibili.csv"

    # 可选: 重新生成HTML页面
    if command -v make &>/dev/null; then
        log_info "正在更新HTML页面..."
        make generate_pages &>/dev/null
        make_status=$?

        if [ $make_status -eq 0 ]; then
            log_success "✅ HTML页面已更新"
        else
            log_error "⚠️ HTML页面更新失败 (错误码: $make_status)，请手动运行 'make generate_pages'"
        fi
    else
        log_debug "未找到make命令，跳过HTML更新"
    fi

    # 显示文件的最后几行，确认添加成功
    log_debug "bilibili.csv 的最后几行:"
    tail -3 bilibili.csv | while read line; do
        log_debug "CSV: $line"
    done
else
    log_error "❌ 写入CSV文件失败 (错误码: $write_status)"
    exit 1
fi

log_info "脚本执行完毕于 $(date '+%Y-%m-%d %H:%M:%S')"
