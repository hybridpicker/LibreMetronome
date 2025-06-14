#!/bin/bash
# Setup git hooks for the project

HOOKS_DIR=".githooks"
GIT_HOOKS_DIR=".git/hooks"

# Check if we're in the right directory
if [ ! -d "$HOOKS_DIR" ]; then
    echo "Error: $HOOKS_DIR directory not found!"
    echo "Please run this script from the project root."
    exit 1
fi

echo "🔧 Setting up Git hooks..."

# Create symlinks for each hook
for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        target="$GIT_HOOKS_DIR/$hook_name"
        
        # Remove existing hook if it exists
        if [ -e "$target" ]; then
            echo "  Removing existing $hook_name..."
            rm "$target"
        fi
        
        # Create symlink
        echo "  Installing $hook_name..."
        ln -s "../../$HOOKS_DIR/$hook_name" "$target"
        
        # Make sure it's executable
        chmod +x "$hook"
    fi
done

echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: Runs tests before committing"
echo "  - pre-push: Runs full test suite before pushing"
echo ""
echo "To skip hooks temporarily, use:"
echo "  git commit --no-verify"
echo "  git push --no-verify"
