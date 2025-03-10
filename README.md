# HTML checkboxes

This plugin allows you to quickly add HTML checkboxes to your notes and makes them clickable. 

![image](html-check.png)

## Why use HTML checkboxes?

The main reason you may want to use HTML checkboxes instead of Markdown checkboxes is that you can put them into Markdown tables. You can also place them anywhere in the note, for example add several checkboxes in the row. Also all of your Markdown stays valid, and even if you turn the plugin off, all created checkboxes would still be visible (just not clickable).

## Usage

To create checkbox you should put cursor to the place you want and call the command "Add HTML checkbox". Alternatively you can select the option in the editor menu. Be aware that every created checkbox has a unique id, it is nesessary for the checkboxes to be clickable. Do not remove the id and make sure you don't have several checkboxes with the same id within the same file, otherwise they will not work. 

If you want to copy and paste checkboxes within the same file, it is important to change IDs, so they are note duplicate existing ones. This can be done in two ways:
1. Enable option "Automatically fix duplicated IDs on pasting" in plugin settings. In this case every time you paste checkboxes, plugin would scan the file to find and fix any repeating IDs. Be aware that pasting may become slow, if you pasting many checkboxes at once or if there are already many checkboxes in the file.
2. You can fix all checkboxes that are already in the file by chosing command "Fix HTML checkboxes" from command pallete or from editor menu.

It is recommended to never edit checkboxes manually. Also checkboxes are NOT added automatically on the next line when you hit "enter".

When right-clicking on the checkbox you will see the menu allowing you to select between a few of alternate checkboxes (you will need the theme or special css to make alternate checkboxes look different). Note that not all of possble alternate checkboxes are supported, and I am not planning to add more. When the alternate checkboxes menu appears inside the table it will hide the default table right-click menu. If you want to see table right-click menu, you should click on some other place in the cell.

Plugin works in embedded views as well, but clicking on checkboxes may cause some blinking in canvas.
