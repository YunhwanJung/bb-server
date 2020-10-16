import {
  Resolver,
  Query,
  Mutation,
  Arg,
  ObjectType,
  Field,
  Ctx,
} from "type-graphql";
import { Member } from "../entities/Member";
import bcrypt from "bcrypt";
import { Context } from "koa";
import {
  createAccessToken,
  createRefreshToken,
  deleteCookie,
  setRefreshTokenIntoCookie,
} from "../utils/token";
import { AuthenticationError, UserInputError } from "apollo-server-koa";
import { MemberProfile } from "../entities/MemberProfile";

@ObjectType()
class LoginResponse {
  @Field()
  accessToken!: string;
  @Field(() => Member)
  member!: Member;
}
@Resolver()
export class MemberResolver {
  @Query(() => Boolean)
  async test() {
    return true;
  }
  @Mutation(() => Boolean)
  async register(
    @Arg("username") username: string,
    @Arg("email") email: string,
    @Arg("password") password: string
  ) {
    const preExistingAccount = await Member.findOne({ where: { email } });
    if (preExistingAccount)
      throw new UserInputError("already registered email");

    const hashedPassword = await bcrypt.hash(password, 12);
    const memberInstance = await Member.create({
      username,
      email,
      password: hashedPassword,
    });
    const profileInstance = await MemberProfile.create();

    memberInstance.profile = profileInstance;
    profileInstance.member = memberInstance;
    await memberInstance.save();
    await profileInstance.save();

    return true;
  }
  @Mutation(() => LoginResponse)
  async login(
    @Arg("email") inputEmail: string,
    @Arg("password") inputPassword: string,
    @Ctx()
    ctx: Context
  ): Promise<LoginResponse> {
    const member = await Member.createQueryBuilder("member")
      .select([
        "member.id",
        "member.email",
        "member.username",
        "member.password",
        "member.token_version",
        "profile.avatar_url",
      ])
      .leftJoin("member.profile", "profile")
      .where({ email: inputEmail })
      .getOne();
    if (!member) throw new AuthenticationError("not registered email");
    const isPasswordCorrect = await bcrypt.compare(
      inputPassword,
      member.password
    );
    if (!isPasswordCorrect) throw new AuthenticationError("incorrect password");

    setRefreshTokenIntoCookie(ctx, createRefreshToken(member));
    return {
      accessToken: createAccessToken(member),
      member,
    };
  }
  @Mutation(() => Boolean)
  async revokeToken(@Ctx() ctx: Context, @Arg("memberId") memberId: string) {
    await Member.getRepository().increment(
      { id: memberId },
      "token_version",
      1
    );
    deleteCookie(ctx);
    return true;
  }
}