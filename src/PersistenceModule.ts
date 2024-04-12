import fs from 'fs';

class PersistenceModule {
  private static state: any;

  /**
   * Saves the state to a JSON file.
   * @param key - The key used to identify the state file.
   * @param value - The state value to be saved.
   */
  private saveState(key: string, value: any): void {
    const filePath = `${key}.json`;
    const data = JSON.stringify(value, null, 2);
    fs.writeFileSync(filePath, data);
  }

  /**
   * Retrieves the state from memory or loads it from a JSON file if not available in memory.
   * @template T - The type of the state object.
   * @param key - The key used to identify the state file.
   * @param defaultValue - The default value to be used if the state file doesn't exist.
   * @returns The state object.
   */
  public getState<T extends object>(key: string, defaultValue?: T): T {
    if (!PersistenceModule.state) {
      PersistenceModule.state = this.loadState(key, defaultValue);
    }
    return PersistenceModule.state as T;
  }

  /**
   * Loads the state from a JSON file or returns the default value if the file doesn't exist.
   * @template T - The type of the state object.
   * @param key - The key used to identify the state file.
   * @param defaultValue - The default value to be used if the state file doesn't exist.
   * @returns The loaded state object or the default value.
   */
  private loadState<T extends object>(key: string, defaultValue?: T): T {
    const filePath = `${key}.json`;
    try {
      console.log(`Loading state from file: ${filePath}`);

      // Check if the state file exists
      if (!fs.existsSync(filePath)) {
        // If the file doesn't exist, use the default value or an empty object
        PersistenceModule.state = defaultValue || {};
      } else {
        // If the file exists, read its contents and parse it as JSON
        const data = fs.readFileSync(filePath, 'utf8');
        PersistenceModule.state = JSON.parse(data) as T;
      }

      console.log(`State loaded successfully from file`, { filePath, state: PersistenceModule.state });

      // Return a Proxy object that intercepts and handles state updates
      return new Proxy(PersistenceModule.state, {
        set: (target: any, prop: string, value: any) => {
          console.log(`Updating state with`, { target, prop, value });
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

