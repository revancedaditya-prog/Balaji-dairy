// Offline Transaction Queue Handler
const QUEUE_KEY = 'balaji_dairy_offline_queue';

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToOfflineQueue = (type, payload) => {
  try {
    const queue = getOfflineQueue();
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type, // 'MILK_ENTRY' | 'DELIVERY' | 'PAYMENT'
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return item;
  } catch (err) {
    console.error('Failed to save offline item', err);
    return null;
  }
};

export const removeOfflineQueueItem = (id) => {
  try {
    const queue = getOfflineQueue().filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to remove offline item', err);
  }
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};
