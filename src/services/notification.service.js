import { get, put } from "./api";

export const NotificationService = {
  getNotifications: async () => {
    try {
      const response = await get("/notifications");
      return response;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  markAsRead: async (id) => {
    try {
      const response = await put(`/notifications/${id}/read`);
      return response;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      throw error;
    }
  }
};
