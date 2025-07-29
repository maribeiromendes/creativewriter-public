#!/bin/bash

# Script to remove static background images from all Angular components
# and replace them with transparent backgrounds

FILES=(
    "src/app/stories/components/story-settings.component.ts"
    "src/app/stories/components/story-list.component.ts"
    "src/app/shared/components/app-header.component.ts"
    "src/app/stories/components/story-editor.component.ts"
    "src/app/stories/components/story-stats.component.ts"
    "src/app/stories/components/story-structure.component.ts"
    "src/app/stories/components/codex.component.ts"
    "src/app/stories/components/scene-chat.component.ts"
    "src/app/stories/components/ai-log-tab.component.ts"
    "src/app/stories/components/ai-request-logger.component.ts"
    "src/app/stories/components/novelcrafter-import.component.ts"
    "src/app/stories/components/image-generation.component.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Replace the complex background pattern with simple transparent background
        sed -i.bak '/:host {/,/}/ {
            s|background: *$|background: transparent;|
            /linear-gradient.*rgba(0, 0, 0, 0.6)/d
            /Main anime image/d
            /url.*cyberpunk-anime-girl.png/d
            /Fallback dark background/d
            /#1a1a1a;/d
            /background-size:/d
            /background-position:/d
            /background-repeat:/d
            /background-attachment:/d
        }' "$file"
        
        echo "Processed $file"
    else
        echo "File $file not found, skipping..."
    fi
done

echo "Background fix completed!"