export function setupRightMenu(onMenuItemSelected) {
    const rightMenuToggle = document.getElementById('right-menu-toggle');
    const primitivesMenu = document.getElementById('primitives-menu');
    let rightMenuOpen = false;
    // Toggle RightMenu Visibility
    rightMenuToggle.addEventListener('click', () => {
        rightMenuOpen = !rightMenuOpen;
        primitivesMenu.style.transform = rightMenuOpen ? 'translateX(0)' : 'translateX(100%)';
        rightMenuToggle.style.right = rightMenuOpen ? '200px' : '5px';
        rightMenuToggle.classList.toggle('open', rightMenuOpen);
    });
    // Log a placeholder when menu items are clicked
    const menuItems = document.querySelectorAll('#primitives-menu li');
    menuItems.forEach((menuItem) => {
        menuItem.addEventListener('click', () => {
            console.log(`Menu item clicked: ${menuItem.textContent}`);
            onMenuItemSelected();
        });
    });
}
