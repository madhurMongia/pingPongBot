import fs from 'fs';
import path from 'path';

class PersistenceModule {
    private readonly dataDirectory: string;

    constructor(dataDirectory: string) {
        this.dataDirectory = dataDirectory;
        fs.mkdirSync(this.dataDirectory, { recursive: true });
    }

    public async saveState(key: string, value: any): Promise<void> {
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        const data = JSON.stringify(value, null, 2);
        await fs.promises.writeFile(filePath, data);
    }

    public async loadState<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        try {
            const data = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(data) as T;
        } catch (error) {
            if (defaultValue !== undefined) {
                await this.saveState(key, defaultValue);
                return defaultValue;
            }
            return undefined;
        }
    }
}

export default PersistenceModule;