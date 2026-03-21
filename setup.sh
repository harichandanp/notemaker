#!/bin/bash

# NoteMaker Development Setup Script
echo "🚀 Setting up NoteMaker development environment..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust already installed"
fi

# Install Tauri CLI
echo "📦 Installing Tauri CLI..."
cargo install tauri-cli

# Verify installation
echo "🔍 Verifying installation..."
cargo --version
cargo tauri --version

# Create notes directory
echo "📁 Creating notes directory..."
mkdir -p ~/Documents/NoteMaker

echo "✅ Setup complete!"
echo ""
echo "🎯 To start development:"
echo "   cd /Users/hari/notemaker"
echo "   cargo tauri dev"
echo ""
echo "🌐 To test frontend only:"
echo "   python3 -m http.server 1420"
echo "   open http://localhost:1420"
