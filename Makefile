SHELL := /bin/bash

.PHONY: help serve generate_csv_list generate_pages

CSV_FILES_JSON = csv_files.json
PAGE_TEMPLATE = page_template.html

help:
	@echo "Available commands:"
	@echo "  make serve              - Generate files and start a local HTTP server"
	@echo "  make generate_csv_list  - Generate/update the list of CSV files ($(CSV_FILES_JSON))"
	@echo "  make generate_pages     - Generate individual HTML pages for each CSV file"
	@echo "  make all                - Generate CSV list and all HTML pages"

default: all serve

all: clean generate_csv_list generate_pages

serve: all
	@echo "Starting local server at http://localhost:8000/"
	@python3 -m http.server 8000

generate_csv_list:
	@echo "Generating $(CSV_FILES_JSON)..."
	@find . -maxdepth 1 -name '*.csv' -exec basename {} \; | sort | jq -R . | jq -s . > $(CSV_FILES_JSON)
	@echo "$(CSV_FILES_JSON) generated."

generate_pages:
	@echo "Generating individual HTML pages from $(PAGE_TEMPLATE)..."
	@if [ ! -f $(CSV_FILES_JSON) ]; then \
		echo "Error: $(CSV_FILES_JSON) not found. Run 'make generate_csv_list' first."; \
		exit 1; \
	fi
	@jq -r '.[]' $(CSV_FILES_JSON) | while read csv_file; do \
		html_file=$$(echo "$$csv_file" | sed 's/\.csv$$/.html/'); \
		csv_basename=$$(echo "$$csv_file" | sed 's/\.csv$$//'); \
		formatted_title="$$csv_basename"; \
		echo "  Generating $$html_file for $$csv_file (Title: $$formatted_title)..."; \
		sed -e "s/%%CSV_FILENAME%%/$$csv_file/g" \
		    -e "s/%%CSV_BASENAME%%/$$csv_basename/g" \
		    -e "s/%%FORMATTED_TITLE%%/$$formatted_title/g" \
		    $(PAGE_TEMPLATE) > "$$html_file"; \
	done
	@echo "Individual HTML pages generated."

clean:
	@echo "Cleaning generated HTML files (except index.html, page_template.html) and $(CSV_FILES_JSON)..."
	@jq -r '.[]' $(CSV_FILES_JSON) | while read csv_file; do \
		html_file=$$(echo "$$csv_file" | sed 's/\.csv$$/.html/'); \
		rm -f "$$html_file"; \
	done
	@rm -f $(CSV_FILES_JSON)
	@echo "Clean complete."
