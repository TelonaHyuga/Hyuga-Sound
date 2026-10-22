# Hyuga-Sound
Hyuga Sound - Guitar Toolkit

# Change language in information menu

# Init
1. git clone https://github.com/TelonaHyuga/Hyuga-Sound.git
2. cd Hyuga-Sound
3. npm init -y
4. npm install --save-dev electron electron-builder esbuild pitchy
5. npm run build:pitchy

# Debug And Build

for just run - npm start

1. for compile appimage - npm run build
2. for compile exe - npx electron-builder --win
3. for compile all - chmod +x /build-all.sh and run it

# FOR LINUX
-- I dont know --

1. chmod +x install.large.sh
2. install.large.sh require sudo pacman -S imagemagick

-- Install .desktop, svg icon and XDG to your user --

1. chmod +x install.sh
2. install.sh - lite install version (move desktop and icons to share directories, and add mime type)

-- Uninstall .desktop, svg icon and XDG--

1. chmod +x uninstall.sh
2. uninstall.sh - uninstall all files, and from large verion
