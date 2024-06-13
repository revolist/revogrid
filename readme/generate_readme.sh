#!/bin/bash

# Define the list of markdown files to be concatenated
files=("banner.md" "features.md" "framework.md" "install.md" "usage.basic.md" "usage.js.md" "usage.vue2.md" "version.md" "contribute.md" "LICENSE.md")

# Output file
output="README.md"

# Clear the existing README.md if it exists
> "$output"

# Loop through each file and append its contents to README.md
for file in "${files[@]}"
do
    if [ -f "./readme/$file" ]; then
        echo "Processing $file..."
        cat "./readme/$file" >> "$output"
        echo -e "\n" >> "$output" # Add a newline for separation between sections
    else
        echo "Warning: $file not found, skipping."
    fi
done

echo "README.md has been successfully generated."
