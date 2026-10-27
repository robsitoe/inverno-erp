import { Injectable, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { initialAdminPassword } from '../common/secrets';
import { LicensesService } from '../licenses/licenses.service';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly licensesService: LicensesService,
  ) { }

  async onModuleInit() {
    try {
      const adminUser = await this.findOneByUsername('admin');
      // Palavra-passe inicial: INITIAL_ADMIN_PASSWORD, ou aleatória (impressa UMA vez). 'admin' só em desenvolvimento.
      const ip = initialAdminPassword();
      const initial = ip.value;
      const generated = ip.generated;
      if (!adminUser) {
        const initialHash = await bcrypt.hash(initial, 10);
        await this.userRepository.save(this.userRepository.create({
          id: 'admin', username: 'admin', password: initialHash,
          name: 'Administrator', isAdmin: true, isSuperAdmin: true, isTechnical: true,
          isActive: true, language: 'pt', permissions: [],
        }));
        console.log(generated
          ? `[Setup] Administrador criado. Utilizador: admin | Palavra-passe inicial: ${initial}  (guarde-a e altere-a no primeiro acesso; não será mostrada de novo)`
          : '[Setup] Administrador criado.');
      } else if (process.env.RESET_ADMIN_PASSWORD === 'true' && process.env.INITIAL_ADMIN_PASSWORD) {
        // Recuperação explícita e consciente — nunca automática.
        adminUser.password = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 10);
        adminUser.isAdmin = true; adminUser.isSuperAdmin = true; adminUser.isActive = true;
        await this.userRepository.save(adminUser);
        console.warn('[Setup] Palavra-passe do admin REPOSTA por RESET_ADMIN_PASSWORD. Remova esta variável do .env.');
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

    const total = await this.userRepository.count();
    await this.licensesService.assertCanAddUser(Math.max(0, total - 1)); // o administrador interno não conta

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

  /** Remove o hash da palavra-passe antes de devolver o utilizador numa resposta HTTP. */
  static toPublic<T extends { password?: string } | null | undefined>(user: T): Omit<NonNullable<T>, 'password'> {
    if (!user) return user as any;
    const { password, ...safe } = user as any;
    return safe;
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
