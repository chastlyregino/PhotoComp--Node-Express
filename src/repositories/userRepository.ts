import { User, UserRole, UserStatus, UserOrganization } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../config/db';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';

const USER_TABLE = process.env.USER_TABLE || 'Users';
const USER_ORG_TABLE = process.env.USER_ORG_TABLE || 'UserOrganizations';

export class UserRepository {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const userId = uuidv4();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser: User = {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: hashedPassword,
      role: userData.role || UserRole.MEMBER,
      status: userData.status || UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };
    
    await dynamoDb.send(new PutCommand({
      TableName: USER_TABLE,
      Item: newUser,
      ConditionExpression: 'attribute_not_exists(email)'
    }));
    
    return newUser;
  }
  
  async getUserById(userId: string): Promise<User | null> {
    const result = await dynamoDb.send(new GetCommand({
      TableName: USER_TABLE,
      Key: { id: userId }
    }));
    
    return result.Item as User || null;
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: USER_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }));
    
    return result.Items && result.Items.length > 0 ? result.Items[0] as User : null;
  }
  
  async updateUser(userId: string, userData: Partial<User>): Promise<User | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(userData).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date();
    
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: USER_TABLE,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));
    
    return result.Attributes as User || null;
  }
  
  async deleteUser(userId: string): Promise<boolean> {
    await dynamoDb.send(new DeleteCommand({
      TableName: USER_TABLE,
      Key: { id: userId }
    }));
    
    return true;
  }
  
  async applyToOrganization(userId: string, organizationId: string): Promise<UserOrganization> {
    const userOrg: UserOrganization = {
      userId,
      organizationId,
      role: UserRole.MEMBER,
      status: UserStatus.PENDING,
      joinedAt: new Date()
    };
    
    await dynamoDb.send(new PutCommand({
      TableName: USER_ORG_TABLE,
      Item: userOrg
    }));
    
    return userOrg;
  }
  
  async getUserOrganizations(userId: string): Promise<UserOrganization[]> {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: USER_ORG_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    
    return result.Items as UserOrganization[] || [];
  }
  
  async updateUserOrganizationStatus(
    userId: string, 
    organizationId: string, 
    status: UserStatus
  ): Promise<UserOrganization | null> {
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: USER_ORG_TABLE,
      Key: { userId, organizationId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      ReturnValues: 'ALL_NEW'
    }));
    
    return result.Attributes as UserOrganization || null;
  }
  
  async updateUserOrganizationRole(
    userId: string, 
    organizationId: string, 
    role: UserRole
  ): Promise<UserOrganization | null> {
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: USER_ORG_TABLE,
      Key: { userId, organizationId },
      UpdateExpression: 'SET #role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role },
      ReturnValues: 'ALL_NEW'
    }));
    
    return result.Attributes as UserOrganization || null;
  }
  
  async removeUserFromOrganization(userId: string, organizationId: string): Promise<boolean> {
    await dynamoDb.send(new DeleteCommand({
      TableName: USER_ORG_TABLE,
      Key: { userId, organizationId }
    }));
    
    return true;
  }
  
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default new UserRepository();