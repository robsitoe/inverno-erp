import { Injectable, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async onModuleInit() {
    try {
      let adminUser = await this.findOneByUsername('admin');
      const hashedPassword = await bcrypt.hash('admin', 10);

      if (!adminUser) {
        adminUser = this.userRepository.create({
          id: 'admin',
          username: 'admin',
          password: hashedPassword,
          name: 'Administrator',
          isAdmin: true,
          isSuperAdmin: true,
          isTechnical: true,
          isActive: true,
          language: 'pt',
          permissions: []
        });
        await this.userRepository.save(adminUser);
        console.log('Default admin user created: admin / admin');
      } else {
        // Force reset admin credentials to ensure access during development/migration
        adminUser.password = hashedPassword;
        adminUser.isAdmin = true;
        adminUser.isSuperAdmin = true;
        adminUser.isActive = true;
        await this.userRepository.save(adminUser);
        console.log('Admin credentials verified/reset: admin / admin');
      }
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { username: createUserDto.username } });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      // Only hash if it's not already a bcrypt hash
      if (!updateUserDto.password.startsWith('$2b$')) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }
    } else {
      // Remove password from DTO if not provided to avoid overwriting with empty
      delete (updateUserDto as any).password;
    }

    this.userRepository.merge(user, updateUserDto);
    return this.userRepository.save(user);
  }

  remove(id: string) {
    return this.userRepository.delete(id);
  }
}
