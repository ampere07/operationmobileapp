import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage utility for React Native
 * Provides a consistent API similar to localStorage but async
 */
export const storage = {
  /**
   * Store a value
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  /**
   * Retrieve a value
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  /**
   * Remove a value
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  },

  /**
   * Clear all storage
   */
  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  },

  /**
   * Get all keys
   */
  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  },

  /**
   * Get multiple items
   */
  multiGet: async (keys: string[]): Promise<readonly [string, string | null][]> => {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Storage multiGet error:', error);
      return [];
    }
  },

  /**
   * Set multiple items
   */
  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Storage multiSet error:', error);
      throw error;
    }
  },

  /**
   * Store an object (automatically stringifies)
   */
  setObject: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage setObject error:', error);
      throw error;
    }
  },

  /**
   * Retrieve an object (automatically parses)
   */
  getObject: async <T = any>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage getObject error:', error);
      return null;
    }
  }
};

export default storage;
