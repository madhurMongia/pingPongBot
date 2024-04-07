import fs from 'fs';
import path from 'path';

class PersistenceModule {
    private readonly dataDirectory: string;
    
    constructor(dataDirectory: string) {
        this.dataDirectory = dataDirectory;
        fs.mkdirSync(this.dataDirectory, { recursive: true });
    }

    private async saveState(key: string, value: any): Promise<void> {
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        const data = JSON.stringify(value, null, 2);
        await fs.promises.writeFile(filePath, data);
    }

    public loadState<T extends object>(key: string, defaultValue?: T):T{
        const filePath = path.join(this.dataDirectory, `${key}.json`);
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const state = JSON.parse(data) as T;
            return new Proxy(state, {
                set: (target:any, prop: string, value: any) => {
                    target[prop] = value;
                    this.saveState(key, target);
                    return true;
                },
            });
        } catch (error) {
            console.log(`Could not read state from file. Using default value.`);
            const initialState = defaultValue || {} ;
            return new Proxy(initialState, {
                set: (target:any, prop: string, value: any) => {
                    target[prop] = value;
                    this.saveState(key, target);
                    return true;
                },
            });
        }
    }
}

export default PersistenceModule;

