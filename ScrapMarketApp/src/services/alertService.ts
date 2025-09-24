import { n8nMcpService } from './n8nMcpService';

// Alert interfaces
export interface UserAlert {
  id?: string;
  userId: string;
  productName: string;
  canonname: string;
  targetPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertResponse {
  status: string;
  data: UserAlert;
  message: string;
}

// Alert Service Class
class AlertService {
  async createAlert(alertData: Omit<UserAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertResponse> {
    try {
      const data = await n8nMcpService.createUserAlert(alertData);
      
      return {
        status: 'success',
        data: data,
        message: 'Alert created successfully',
      };
    } catch (error) {
      console.error('Create alert error:', error);
      throw new Error('Failed to create alert');
    }
  }

  async updateAlert(alertId: string, alertData: Partial<UserAlert>): Promise<AlertResponse> {
    try {
      const data = await n8nMcpService.createUserAlert({ ...alertData, id: alertId });
      
      return {
        status: 'success',
        data: data,
        message: 'Alert updated successfully',
      };
    } catch (error) {
      console.error('Update alert error:', error);
      throw new Error('Failed to update alert');
    }
  }

  async deleteAlert(alertId: string): Promise<AlertResponse> {
    try {
      const data = await n8nMcpService.createUserAlert({ 
        id: alertId, 
        isActive: false 
      });
      
      return {
        status: 'success',
        data: data,
        message: 'Alert deleted successfully',
      };
    } catch (error) {
      console.error('Delete alert error:', error);
      throw new Error('Failed to delete alert');
    }
  }

  async getUserAlerts(userId: string): Promise<UserAlert[]> {
    try {
      // This would typically be a GET request to fetch user alerts
      // For now, we'll use the create endpoint as a placeholder
      const data = await n8nMcpService.createUserAlert({ 
        userId, 
        action: 'get_alerts' 
      });
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get user alerts error:', error);
      throw new Error('Failed to get user alerts');
    }
  }
}

export const alertService = new AlertService();


