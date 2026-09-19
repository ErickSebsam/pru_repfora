import { get } from "./api";

export const EnvironmentService = {
  getEnvironments: async () => {
    try {
      const response = await get("/environments");
      return response;
    } catch (error) {
      console.error("Error fetching environments:", error);
      throw error;
    }
  }
};
