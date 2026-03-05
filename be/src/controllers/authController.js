import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Seccsion from '../models/Seccsion.js';

const ACCESS_TOKEN_TTL = '15m'; //* Thường dưới 15 phút
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 1000; //*thường dưới 14 ngày
// * Đăng ký
export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, phone } = req.body;
        if (!username || !password || !email || !firstName || !lastName) {
            return res
                .status(400)
                .json({ message: 'Không thể thiếu username,password,email,firstName và lastName' });
        }

        //* Kiểm tra xem username tồn tại chưa
        const lowerCaseUsername = username.toLowerCase();
        const duplicate = await User.findOne({ username: lowerCaseUsername });
        if (duplicate) {
            return res.status(409).json({ message: 'username đã tồn tại !' });
        }

        //* Kiểm tra trùng số điện thoại nếu có
        if (phone) {
            const phoneExists = await User.findOne({ phone });
            if (phoneExists) {
                return res.status(409).json({ message: 'Số điện thoại đã được sử dụng !' });
            }
        }

        //* mã hóa passowrd
        const hashedPassword = await bcrypt.hash(password, 10);
        //* tạo user mới
        const userData = {
            username: lowerCaseUsername,
            hashedPassword,
            email: email.toLowerCase(),
            displayName: `${firstName} ${lastName}`,
        };
        if (phone) userData.phone = phone;

        await User.create(userData);
        //* return
        return res.sendStatus(204);
    } catch (error) {
        console.log('Lỗi khi gọi signUp', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
// * Đăng nhập - hỗ trợ email, số điện thoại, hoặc username
export const signIn = async (req, res) => {
    try {
        // * lấy từ input - identifier có thể là email, phone, hoặc username
        const { identifier, password, username } = req.body;
        const loginId = identifier || username; // fallback cho client cũ
        console.log(`Login attempt for: ${loginId}`);

        if (!loginId || !password) {
            return res.status(400).json({ message: 'Thiếu thông tin đăng nhập hoặc mật khẩu' });
        }

        //* Xác định kiểu đăng nhập và tìm user
        let user;
        const trimmedId = loginId.trim();

        if (trimmedId.includes('@')) {
            //* Đăng nhập bằng email
            user = await User.findOne({ email: trimmedId.toLowerCase() });
        } else if (/^\+?\d{9,15}$/.test(trimmedId.replace(/\s/g, ''))) {
            //* Đăng nhập bằng số điện thoại
            user = await User.findOne({ phone: trimmedId.replace(/\s/g, '') });
        } else {
            //* Đăng nhập bằng username (fallback)
            user = await User.findOne({ username: trimmedId.toLowerCase() });
        }

        if (!user) {
            console.log(`User not found: ${loginId}`);
            return res
                .status(400)
                .json({ message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác!' });
        }
        //* Kiểm tra password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordCorrect) {
            console.log(`Invalid password for user: ${loginId}`);
            return res
                .status(401)
                .json({ message: 'Thông tin đăng nhập hoặc mật khẩu không chính xác!' });
        }

        //* Nếu khớp thì tạo accessToken với JWT
        const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_TTL,
        });

        //* Tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        //* Tạo sesion mới để lưu resfreh token
        await Seccsion.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        const isProduction = process.env.NODE_ENV === 'production';

        //* Trả refresh tooken về cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction, // Chỉ dùng secure: true ở production (HTTPS)
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: REFRESH_TOKEN_TTL,
        });

        console.log(`Login successful for user: ${user.username}`);

        //* Trả aceess token về trong res
        return res
            .status(200)
            .json({ message: `User:${user.displayName} đã logged in !`, accessToken });
    } catch (error) {
        console.error('Lỗi khi gọi signIn', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
//* Đăng xuất
export const signOut = async (req, res) => {
    try {
        //* lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;
        if (token) {
            //* Xóa refresh tokeb trong session
            await Seccsion.deleteOne({ refreshToken: token });
            //* Xóa cookie
            res.clearCookie('refreshToken');
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log('Lỗi khi gọi signIn', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
//* Tạo accesstoken mới từ refresh Token
export const refreshToken = async (req, res) => {
    try {
        //* Lấy refreshToken từ cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({
                message: 'Token không tồn tại !',
            });
        }
        //* so với refresh token trong db */
        const session = await Seccsion.findOne({ refreshToken: token });
        if (!session) {
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        //* Kiểm tra xem hết hạn token chưa
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: 'Token đã hết hạn' });
        }

        //* Tạo accessToken mới
        const accessToken = jwt.sign(
            {
                userId: session.userId,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );
        //* Return
        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Lỗi khi gọi refresh', error);
        res.status(500).json({ message: 'Lỗi hệ thống' });
    }
};
