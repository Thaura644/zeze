const userService = require('../services/userService');
const bcrypt = require('bcryptjs');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12),
        display_name: 'Test User',
        skill_level: 3
      };

      const user = await userService.createUser(userData);

      expect(user).toHaveProperty('user_id');
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.display_name).toBe(userData.display_name);
      expect(user.skill_level).toBe(userData.skill_level);
      expect(user.created_at).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      await userService.createUser(userData);

      const duplicateUserData = {
        email: 'test@example.com',
        username: 'testuser2',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      await expect(userService.createUser(duplicateUserData))
        .rejects.toThrow('Email already exists');
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        email: 'test1@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      await userService.createUser(userData);

      const duplicateUserData = {
        email: 'test2@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      await expect(userService.createUser(duplicateUserData))
        .rejects.toThrow('Username already exists');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);
      const foundUser = await userService.getUserById(createdUser.user_id);

      expect(foundUser.user_id).toBe(createdUser.user_id);
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.username).toBe(userData.username);
    });

    it('should return null when user not found', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const user = await userService.getUserById(fakeUserId);

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      await userService.createUser(userData);
      const foundUser = await userService.getUserByEmail(userData.email);

      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.username).toBe(userData.username);
    });

    it('should return null when user not found', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);
      const updateData = {
        display_name: 'Updated Name',
        skill_level: 5,
        preferred_genres: ['rock', 'jazz']
      };

      const updatedUser = await userService.updateUser(createdUser.user_id, updateData);

      expect(updatedUser.display_name).toBe(updateData.display_name);
      expect(updatedUser.skill_level).toBe(updateData.skill_level);
      expect(updatedUser.preferred_genres).toEqual(updateData.preferred_genres);
      expect(updatedUser.updated_at).toBeDefined();
    });

    it('should throw error when no valid fields provided', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);

      await expect(userService.updateUser(createdUser.user_id, {}))
        .rejects.toThrow('No valid fields to update');
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const updateData = { display_name: 'Updated Name' };

      await expect(userService.updateUser(fakeUserId, updateData))
        .rejects.toThrow('User not found');
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);
      const newPassword = await bcrypt.hash('newpassword123', 12);

      const updatedUser = await userService.updatePassword(createdUser.user_id, newPassword);

      expect(updatedUser.hashed_password).toBe(newPassword);
      expect(updatedUser.updated_at).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const newPassword = await bcrypt.hash('newpassword123', 12);

      await expect(userService.updatePassword(fakeUserId, newPassword))
        .rejects.toThrow('User not found');
    });
  });

  describe('getUserProgress', () => {
    it('should return user progress summary', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);
      const progress = await userService.getUserProgress(createdUser.user_id);

      expect(progress).toHaveProperty('user_id', createdUser.user_id);
      expect(progress).toHaveProperty('email', userData.email);
      expect(progress).toHaveProperty('username', userData.username);
      expect(progress).toHaveProperty('skill_level', userData.skill_level);
      expect(progress).toHaveProperty('total_sessions', expect.any(Number));
      expect(progress).toHaveProperty('total_songs_saved', expect.any(Number));
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        hashed_password: await bcrypt.hash('password123', 12)
      };

      const createdUser = await userService.createUser(userData);
      await userService.deleteUser(createdUser.user_id);

      // User should not be found by regular queries
      const user = await userService.getUserById(createdUser.user_id);
      expect(user).toBeNull();

      // But should still exist in database with deleted_at timestamp
      // (This would need a direct query to verify)
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      await expect(userService.deleteUser(fakeUserId))
        .rejects.toThrow('User not found');
    });
  });
});