import fs from 'fs';

class PersistenceModule {
  private static state: any;

  public saveState(key: string, value: any): void {
    const filePath = `${key}.json`;
    const data = JSON.stringify(value, null, 2);
    fs.writeFileSync(filePath, data);
  }

  public getState<T extends object>(key: string, defaultValue?: T): T {
    if (!PersistenceModule.state) {
      PersistenceModule.state = this.loadState(key, defaultValue);
    }
    return PersistenceModule.state as T;
  }

  public loadState<T extends object>(key: string, defaultValue?: T): T {
    const filePath = `${key}.json`;
    try {
      console.log(`Loading state from file: ${filePath}`);
      if (!fs.existsSync(filePath)) PersistenceModule.state = defaultValue || {};
      else {
        const data = fs.readFileSync(filePath, 'utf8');
        PersistenceModule.state = JSON.parse(data) as T;
      }
      console.log(`State loaded successfully from file: ${filePath}`);
      return new Proxy(PersistenceModule.state, {
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
      return defaultValue || ({} as T);
    }
  }
}

export default PersistenceModule;