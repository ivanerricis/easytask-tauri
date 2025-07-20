import { Store } from "@tauri-apps/plugin-store"
import { documentDir } from "@tauri-apps/api/path"
import { exists, mkdir } from "@tauri-apps/plugin-fs"
import { BaseDirectory } from "@tauri-apps/api/path"

const documentPath = await documentDir();
const folderPath = `${documentPath}/EasyTask/`;
const filePath = `${folderPath}settings.dat`;

if (!(await exists(folderPath, { baseDir: BaseDirectory.Document }))) {
    await mkdir(folderPath, { recursive: true, baseDir: BaseDirectory.Document });
}

export const store = await Store.load(filePath);