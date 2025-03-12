import { Editor, Plugin, TFile, Menu, WorkspaceLeaf, PluginSettingTab, App, Setting} from 'obsidian';


interface CMSettings {
	fixOnPaste: boolean;
}

const DEFAULT_SETTINGS: CMSettings = {
	fixOnPaste: true,
};


export default class HTMLCheckboxPlugin extends Plugin {
	settings: CMSettings;


	async onload() {
		await this.loadSettings();
		this.addSettingTab(new HCSettingTab(this.app, this));

		/* Add menu item to create checkbox */

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
			menu.addItem((item) => {
				item
				  .setTitle("Add HTML checkbox")
				  .setIcon("check-square-2")
				  .onClick(async () => {
					this.addCheckbox(editor)
				});
			});
			menu.addItem((item) => {
				item
				  .setTitle("Fix HTML checkboxes")
				  .setIcon("wrench")
				  .onClick(async () => {
					this.fixCheckboxIds(editor)
				});
			});
		}));

		this.addCommand({
			id: "add-html-checkbox",
			name: "Add HTML checkbox",
			editorCallback: async (editor, view) => {
				this.addCheckbox(editor)
			}
		});

		this.addCommand({
			id: "fix-checkbox-ids",
			name: "Fix HTML checkboxes",
			editorCallback: async (editor, view) => {
				this.fixCheckboxIds(editor)
			}
		});





		/* Add listener to make checkbox clickable */

		this.registerDomEvent(window, 'click', async (e: MouseEvent) => {
			let target = e.target as HTMLElement

			if (target.localName == "input"  && 
				(target as HTMLInputElement).type == "checkbox" &&
				target.id && target.id.startsWith("hc-")
			) {
				
				e.preventDefault()
				let file = this.app.workspace.getActiveFile()

				/* Check if checkbox is inside embedded file */
				let embedWrapper = target.closest(".internal-embed")

				if (embedWrapper) {
					let embedSrc = embedWrapper.getAttribute("src") || ""
					file = this.app.metadataCache.getFirstLinkpathDest(embedSrc, "")
				} 

				if (file instanceof TFile) {

					await this.app.vault.process(file, (content) => {

						let id = target.id
						let checkboxRE = new RegExp("<input[^>]*?id=\"" + id + "\"[^>]*?>")

						if (file && file.extension == "canvas") {
							checkboxRE = new RegExp("<input[^>]*?id=\\\\\"" + id + "\\\\\"[^>]*?>")
						}

						let checkboxMatch = content.match(checkboxRE)
						let newContent = content

						if (checkboxMatch) {
							let checkboxString = checkboxMatch[0]
							let dataTaskMatch = checkboxString.match(/data-task="."/)
							let newCheckboxString = checkboxString

							if (!(target as HTMLInputElement).checked) {
								newCheckboxString = newCheckboxString.replace(">", " checked>") 
								
							} else {
								newCheckboxString = newCheckboxString.replace(" checked>", ">").replace(" >", ">")
								if (dataTaskMatch) {
									newCheckboxString = newCheckboxString.replace(dataTaskMatch[0], "")
								}
							}
							newContent = content.replace(checkboxString, newCheckboxString)							
						}
						return newContent
					})

					let inCanvas = target.closest(".canvas-node-content")

					
					if (file.extension != "canvas" && inCanvas) {
						let leaf = this.app.workspace.getMostRecentLeaf()
						if (leaf instanceof WorkspaceLeaf) {
							//@ts-ignore
							await leaf.rebuildView()
						}
					}
				}	
			}
		});





		/* Add menu for alternative checkboxes */


		this.registerDomEvent(window, "contextmenu", (e: MouseEvent) => {

			
			if (e.button == 2) {
				let target = e.target as HTMLElement
				if (target.localName == "input"  && 
					(target as HTMLInputElement).type == "checkbox" && 
					target.id && target.id.startsWith("hc-")
				) {

					const menu = new Menu();

					menu.addItem((item) =>
						item
						.setIcon("square")
						.onClick(() => {
							this.setStatus(" ", target)
						})
					);

					menu.addItem((item) =>
						item
						.setIcon("square-check")
						.setTitle("x")
						.onClick(() => {
							this.setStatus("x", target)
						})
					);

					menu.addItem((item) =>
						item
						.setIcon("square-minus")
						.setTitle("-")
						.onClick(() => {
							this.setStatus("-", target)
						})
					);

					menu.addItem((item) =>
						item
						.setIcon("x-square")
						.setTitle("~")
						.onClick(() => {
							this.setStatus("~", target)
						})
					);

					menu.addItem((item) =>
						item
						.setIcon("square-slash")
						.setTitle("/")
						.onClick(() => {
							this.setStatus("/", target)
						})
					);

					menu.showAtMouseEvent(e as MouseEvent);
					//@ts-ignore
					menu.dom.classList.add("checkbox-menu");
				}
			}
		})




        /* Fix checkboxes on paste */

		/* No typescript error if we use window.document instead of window, but then listener don't work in canvas for some reason. Event bubbles up to the window anyway. */
		//@ts-ignore
		this.registerDomEvent(window, "paste", (e: ClipboardEvent) => {
			if (this.settings.fixOnPaste) {
				let pasteContent = e.clipboardData?.getData("text") || ""
				let re = /(id="hc-)([^"]+)(\")/g;
				let matchPaste = pasteContent?.match(re)

				if (matchPaste) {
					let inCanvas
					if (e.target) {
						let target = e.target as HTMLElement
						inCanvas = target.closest(".mod-inside-iframe")
					}
					if (inCanvas) {
						e.preventDefault()
					}
					let editor = this.app.workspace.activeEditor?.editor
					if (editor) {
						this.fixCheckboxIds(editor, inCanvas, pasteContent)
					}
				}
			}
				
		})
	}

	onunload() {}


	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}


	async saveSettings() {
		await this.saveData(this.settings);
	}


	async addCheckbox(editor: Editor) {		
		let lastLine = editor.lastLine()
		let lastLineLength = editor.getLine(lastLine).length
		let editorContent = editor.getRange({line:0, ch: 0}, {line:lastLine, ch: lastLineLength})
		let id = this.generateNewId(editorContent)
		let checkbox = '<input id="' + id + '" type="checkbox">'
		editor.replaceSelection(checkbox)
	}


	generateNewId(content: string): any {
		let id = "hc-" + (Math.floor(Math.random() * 9000) + 1000);
		let match = content.match("id=\"" + id + "\"")
		if (match) {
			return this.generateNewId(content)
		} else {
			return id
		}
	}


	generateFixedId(content: string, id: string, tryCount: number): any {
		let re = new RegExp(id, "g")
		let match = content.match(re)
		let file = this.app.workspace.getActiveFile()

		if (match && match.length == 1 && file?.extension != "canvas") {
			return id
		} else {
			let newId = 'id="hc-' + (Math.floor(Math.random() * 9000) + 1000) + '"';
			match = content.match(newId)
			if (match) {
				return this.generateFixedId(content, id, tryCount + 1)
			} else {
				return newId
			}
		}
	}


	async fixCheckboxIds(editor: Editor, inCanvas?: Element | null | undefined, pasteContent?: string) {
		let lastLine = editor.lastLine()
		let lastLineLength = editor.getLine(lastLine).length
		let startCursor = editor.getCursor("from")
		let endCursor = editor.getCursor("to")
		let cursor = editor.getCursor()
		editor.setSelection({line:0, ch: 0}, {line:lastLine, ch: lastLineLength})
		let editorContent = editor.getSelection()
		let re = /(id="hc-)([^"]+)(\")/g;
		

		/* In regular notes event triggers after text already pasted, but in canvas - before text pasted, so we need to process content differently. */
		/* In the paste listener we prevented paste with preventDefault(), so we need to add pasted text to content manually. */
		if (inCanvas && pasteContent) {
			let startContent = editor.getRange({line:0, ch: 0}, startCursor)
			let endContent = editor.getRange(endCursor, {line:lastLine, ch: lastLineLength})
			editorContent = startContent + pasteContent + endContent
			cursor.ch = cursor.ch + pasteContent.length
		}

		let matchContent

		let file = this.app.workspace.getActiveFile()
		
		if (file && file.extension == "canvas") {
			let fileContent = await this.app.vault.cachedRead(file)
			re = /(id=\\"hc-)([^"]+)(\\")/g;
			matchContent = fileContent?.match(re)
		} else {
			matchContent = editorContent?.match(re)
		}

		if (matchContent) {
			for (let id of matchContent) {
				id = id.replaceAll('\\\"', '"')
				let newId = this.generateFixedId(editorContent, id, 0)
				if (id != newId) {
					editorContent = editorContent.replace(id, newId)
				}
			}
		}

		editor.setSelection({line:0, ch: 0}, {line:lastLine, ch: lastLineLength})
		editor.replaceSelection(editorContent)

		lastLine = editor.lastLine()
		lastLineLength = editor.getLine(lastLine).length
		
		if (cursor.line >= lastLine && cursor.ch > lastLineLength) {
			editor.setCursor({line:lastLine, ch: lastLineLength})
		} else {
			editor.setCursor(cursor)
		}
		editor.focus()	
	}


	async setStatus(status: string, target: HTMLElement) {
		let file = this.app.workspace.getActiveFile()
		
		/* Check if checkbox is inside embedded file */
		let embedWrapper = target.closest(".internal-embed")

		if (embedWrapper) {
			let embedSrc = embedWrapper.getAttribute("src") || ""
			file = this.app.metadataCache.getFirstLinkpathDest(embedSrc, "")
		}

		if (file instanceof TFile) {

			await this.app.vault.process(file, (content) => {
				let id = target.id
				let checkboxRE = new RegExp("<input[^>]*?id=\"" + id + "\"[^>]*?>")

				if (file && file.extension == "canvas") {
					checkboxRE = new RegExp("<input[^>]*?id=\\\\\"" + id + "\\\\\"[^>]*?>")
				}

				let checkboxString = content.match(checkboxRE)![0]
				let newCheckboxString = checkboxString
				let statusRe = new RegExp("data-task=\"" + status + "\"")
				let dataTaskMatch = checkboxString.match(/data-task="."/)

				if (file && file.extension == "canvas") {
					dataTaskMatch = checkboxString.match(/data-task=\\".\\"/)
				}

				let dataTaskMatchFirst = ""
				if (dataTaskMatch) {
					dataTaskMatchFirst = dataTaskMatch[0]
				}

				let statusMatch = checkboxString.match(statusRe)
				let dataTaskString = "data-task=\"" + status + "\""

				if (file && file.extension == "canvas") {
					dataTaskString = 'data-task=\\\"' + status + '\\\"'
				}

				if (status == " ") {
					newCheckboxString = newCheckboxString
					.replace(dataTaskMatchFirst, "")
					.replace(" checked>", ">").replace(" >", ">")
				} else {

					if (dataTaskMatch && !statusMatch) {
						newCheckboxString = newCheckboxString.replace(dataTaskMatchFirst, dataTaskString)
					}

					if (!dataTaskMatch && (target as HTMLInputElement).checked) {
						newCheckboxString = newCheckboxString.replace("checked", dataTaskString + " checked")
					}
			
					if (!dataTaskMatch && !(target as HTMLInputElement).checked) {
						newCheckboxString = newCheckboxString.replace(">", " " + dataTaskString + " checked>")
					}
				}

				let newContent = content.replace(checkboxString, newCheckboxString)
				return newContent
			})

		}
	}
}


class HCSettingTab extends PluginSettingTab {
	plugin: HTMLCheckboxPlugin;

	constructor(app: App, plugin: HTMLCheckboxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Automatically fix duplicated IDs on pasting")
			.setDesc("If you copy and paste any HTML checkboxes, plugin will scan the file and fix any duplicated IDs. Be aware that pasting too many checkboxes at onse may be slow if this option is enabled.")
			.addToggle((toggle) => 
				toggle
					.setValue(this.plugin.settings.fixOnPaste)
					.onChange(async(value) => {
						this.plugin.settings.fixOnPaste = value;
						await this.plugin.saveSettings();
					})
		)
	}
}






