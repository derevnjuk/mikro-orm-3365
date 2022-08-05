import {Embeddable, Embedded, Entity, MikroORM, PrimaryKey, Property} from '@mikro-orm/core';
import {PostgreSqlDriver} from '@mikro-orm/postgresql';

@Embeddable()
export class Address {
  @Property()
  city: string;

  constructor(city: string) {
    this.city = city;
  }
}


@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Embedded(() => Address)
  address: Address;

  constructor(address: Address) {
    this.address = address;
  }
}


const entrypoint = async () => {
  const orm = await MikroORM.init<PostgreSqlDriver>({
    entities: [User],
    contextName: 'pg',
    clientUrl: 'postgresql://user:password@localhost:5432/test',
    type: 'postgresql',
    allowGlobalContext: true
  });
  const {em} = orm;

  // Cleanup DBs
  const clean = async (dispose: boolean = false): Promise<void> => {
    await em.nativeDelete(User, {});

    if (dispose) {
      await orm.close();
    }
  };

  try {
    await clean();

    await orm.em.persistAndFlush(new User(new Address('Paris')));

    const user = await em.createQueryBuilder(User)
      .select(['id', 'address'])
      .where({
        address: {
          city: 'Paris'
        }
      })
      .getSingleResult();

    console.log(user);

    // Throws the same error
    const user2 = await em.createQueryBuilder(User)
      .select(['id', 'address'])
      .where({
        address: {
          city: 'Paris'
        }
      })
      .execute('get', false);

    console.log(user2);

    // Throws different error while parsing query:
    // select "address"."city" from "user" as "u0" - missing FROM-clause entry for table "address"
    const user3 = await em.createQueryBuilder(User)
      .select(['id', 'address.city'])
      .where({
        address: {
          city: 'Paris'
        }
      })
      .execute('get', false);

    console.log(user3);
  } catch (e) {
    console.log(e);
  } finally {
    await clean(true);
  }
};

entrypoint();
