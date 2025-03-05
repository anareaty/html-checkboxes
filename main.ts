import { Editor, Plugin, TFile, Menu, WorkspaceLeaf } from 'obsidian';



export default class HTMLCheckboxPlugin extends Plugin {


	async onload() {

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
		}));

		this.addCommand({
			id: "add-html-checkbox",
			name: "Add HTML checkbox",
			editorCallback: async (editor, view) => {
				this.addCheckbox(editor)
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
					console.log(menu)
					//@ts-ignore
					menu.dom.classList.add("checkbox-menu");
				}
			}
		})



		




	}

	onunload() {}










	async addCheckbox(editor: Editor) {
		const generateId: any = (content: string) => {
			let id = "hc-" + (Math.floor(Math.random() * 999) + 1);
			let match = content.match("id=\"" + id + "\"")
			if (match) {
				return generateId(content)
			} else {
				return id
			}
		}
		
		let lastLine = editor.lastLine()
		let lastLineLength = editor.getLine(lastLine).length
		let editorContent = editor.getRange({line:0, ch: 0}, {line:lastLine, ch: lastLineLength})
		let id = generateId(editorContent)
		let checkbox = '<input id="' + id + '" type="checkbox">'
		editor.replaceSelection(checkbox)
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







