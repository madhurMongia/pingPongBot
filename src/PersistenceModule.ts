import fs from 'fs';

class PersistenceModule {
  private static state: any;

  private saveState(key: string, value: any): void {
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

  private loadState<T extends object>(key: string, defaultValue?: T): T {
    const filePath = `${key}.json`;
    try {
      console.log(`Loading state from file: ${filePath}`);
      if (!fs.existsSync(filePath)) PersistenceModule.state = defaultValue || {};
      else {
        const data = fs.readFileSync(filePath, 'utf8');
        PersistenceModule.state = JSON.parse(data) as T;
      }
      console.log(`State loaded successfully from file`,{filePath,state :PersistenceModule.state});
      return new Proxy(PersistenceModule.state, {
        set: (target: any, prop: string, value: any) => {
          console.log(`updating state with`, {target, prop, value});
          target[prop] = value;
          this.saveState(key, target);
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