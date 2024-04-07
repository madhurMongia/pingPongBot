import fs from 'fs';
import path from 'path';

class PersistenceModule {
    private readonly dataDirectory: string;
    
    constructor(dataDirectory: string) {
        this.dataDirectory = dataDirectory;
        this.createDataDirectory();
    }

    private createDataDirectory(): void {
        if (!fs.existsSync(this.dataDirectory)) {
            fs.mkdirSync(this.dataDirectory, { recursive: true });
            console.log(`Data directory created at ${this.dataDirectory}`);
        }
    }

    private async saveState(key: string, value: any): Promise<void> {
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        const data = JSON.stringify(value, null, 2);
        await fs.promises.writeFile(filePath, data);
        console.log(`State saved to file: ${filePath}`);
    }

    public loadState<T extends object>(key: string, defaultValue?: T): T {
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        try {
            console.log(`Loading state from file: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                console.log(`State file not found. Using default value.`);
                return defaultValue || {} as T;
            }

            const data = fs.readFileSync(filePath, 'utf8');
            const state = JSON.parse(data) as T;
            console.log(`State loaded successfully from file: ${filePath}`);
            return new Proxy(state, {
                set: (target: any, prop: string, value: any) => {
                    target[prop] = value;
                    this.saveState(key, target);
                    console.log(`State updated and saved to file: ${filePath}`);
                    return true;
                },
            });
        } catch (error) {
            console.error(`Error reading state from file: ${filePath}`, error);
            console.log(`Using default value.`);
            return defaultValue || {} as T;
        }
    }
}

export default PersistenceModule;
