#!/bin/bash

# Define the base directory
base_dir="docs/guide/api/components"

# Function to rename readme.md to index.md
rename_readme_to_index() {
    local dir="$1"
    for path in "$dir"/*; do
        if [ -d "$path" ]; then
            rename_readme_to_index "$path"
        elif [ -f "$path" ] && [[ "$(basename "$path")" == "readme.md" ]]; then
            sed -i '' 's|\.\./|./|g' "$path"
            new_path="$(dirname "$path").md"
            mv "$path" "$new_path"
            rm -rf "$(dirname "$path")"
            echo "Renamed: $path to $new_path"
        fi
    done
}

# Start the renaming process from the base directory
rename_readme_to_index "$base_dir"

move_directories_up() {
    local parent_dir="$1"
    local parent_parent_dir="$(dirname "$parent_dir")"

    for subdir in "$parent_dir"/*; do
        if [ -f "$subdir" ]; then
            mv "$subdir" "$parent_parent_dir"
            echo "Moved: $subdir to $parent_parent_dir"
        fi
    done
    rm -rf "$parent_dir"
}

move_directories_up "$base_dir"

echo "All readme.md files have been renamed to index.md."
