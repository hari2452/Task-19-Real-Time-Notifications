from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from config import get_db
from mysql.connector import Error
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from datetime import timedelta

import os
import uuid

from werkzeug.utils import secure_filename


app = Flask(__name__)

# JWT configuration
app.config["JWT_SECRET_KEY"] = "task16-jwt-secret-key-change-this-in-production"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)
jwt = JWTManager(app)

# =========================================
# JWT TOKEN BLACKLIST / BLOCKLIST
# =========================================

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):

    jti = jwt_payload["jti"]

    db = None
    cursor = None

    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            """
            SELECT id
            FROM revoked_tokens
            WHERE jti = %s
            LIMIT 1
            """,
            (jti,)
        )

        revoked_token = cursor.fetchone()

        return revoked_token is not None

    except Error as e:
        print("Token Blacklist Check Error:", e)

        # Fail closed:
        # if blacklist verification cannot be completed,
        # reject the token rather than trusting it.
        return True

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):

    return jsonify({
        "success": False,
        "message": "This token has been revoked. Please login again."
    }), 401


CORS(
    app,
    supports_credentials=False,
    origins=["http://localhost:5173"]
)


bcrypt = Bcrypt(app)


# =========================================
# PRODUCT IMAGE UPLOAD CONFIGURATION
# =========================================

UPLOAD_FOLDER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "uploads"
)

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_SIZE

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


def allowed_file(filename):
    """Return True only when the uploaded file has an allowed image extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


# ------------------------------------------------
# HEALTH CHECK
# ------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():

    db = get_db()

    if db.is_connected():

        db.close()

        return jsonify({
            "success": True,
            "message": "Flask and MySQL connected successfully"
        })

    return jsonify({
        "success": False,
        "message": "Database connection failed"
    }), 500


# ------------------------------------------------
# REGISTER
# ------------------------------------------------

@app.route("/api/register", methods=["POST"])
def register():

    db = None
    cursor = None

    try:

        # Get JSON data from Postman / React
        data = request.get_json()

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")


        # -----------------------------------------
        # 1. Validate required fields
        # -----------------------------------------

        if not name or not email or not password:

            return jsonify({
                "success": False,
                "message": "Name, email and password are required"
            }), 400


        # -----------------------------------------
        # 2. Connect to MySQL
        # -----------------------------------------

        db = get_db()

        cursor = db.cursor(dictionary=True)


        # -----------------------------------------
        # 3. Check whether email already exists
        # -----------------------------------------

        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        existing_user = cursor.fetchone()


        if existing_user:

            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409


        # -----------------------------------------
        # 4. Hash the password
        # -----------------------------------------

        hashed_password = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")


        # -----------------------------------------
        # 5. Insert user into database
        # -----------------------------------------

        cursor.execute(
            """
            INSERT INTO users
            (name, email, password, role)
            VALUES (%s, %s, %s, %s)
            """,
            (
                name,
                email,
                hashed_password,
                "customer"
            )
        )


        # -----------------------------------------
        # 6. Save database changes
        # -----------------------------------------

        db.commit()


        # -----------------------------------------
        # 7. Return success response
        # -----------------------------------------

        return jsonify({
            "success": True,
            "message": "Registration successful"
        }), 201


    except Error as e:

        print("Register Error:", e)

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()



# ------------------------------------------------
# LOGIN
# ------------------------------------------------

@app.route("/api/login", methods=["POST"])
def login():

    db = None
    cursor = None

    try:

        # Get JSON data from Postman / React
        data = request.get_json()

        email = data.get("email")
        password = data.get("password")


        # -----------------------------------------
        # 1. Validate fields
        # -----------------------------------------

        if not email or not password:

            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400


        # -----------------------------------------
        # 2. Connect to database
        # -----------------------------------------

        db = get_db()

        cursor = db.cursor(dictionary=True)


        # -----------------------------------------
        # 3. Find user using email
        # -----------------------------------------

        cursor.execute(
            """
            SELECT id, name, email, password, role
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()


        # -----------------------------------------
        # 4. Check whether user exists
        # -----------------------------------------

        if not user:

            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401


        # -----------------------------------------
        # 5. Check password
        # -----------------------------------------

        password_correct = bcrypt.check_password_hash(
            user["password"],
            password
        )

        if not password_correct:

            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401


        # -----------------------------------------
        # 6. Create JWT tokens
        # -----------------------------------------
        access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={
                "role": user["role"],
                "name": user["name"],
                "email": user["email"]
            }
        )
        refresh_token = create_refresh_token(identity=str(user["id"]))



        # -----------------------------------------
        # 7. Return success response
        # -----------------------------------------

        return jsonify({
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        }), 200


    except Error as e:

        print("Login Error:", e)

        return jsonify({
            "success": False,
            "message": "Database error"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()
            
# ------------------------------------------------
# CURRENT LOGGED-IN USER - JWT
# ------------------------------------------------

@app.route("/api/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    cursor = None

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, email, role, avatar_url, created_at
            FROM users
            WHERE id = %s
        """, (user_id,))

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404

        # Convert created_at to a simple date string
        if user.get("created_at"):
            user["created_at"] = user["created_at"].strftime("%Y-%m-%d")

        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "avatar_url": user["avatar_url"],
                "created_at": user["created_at"]
            }
        }), 200

    except Exception as e:
        print("GET /api/me error:", e)

        return jsonify({
            "success": False,
            "error": "Failed to fetch profile"
        }), 500

    finally:
        if cursor:
            cursor.close()
            
            
            
# ------------------------------------------------
# UPDATE CURRENT USER PROFILE
# ------------------------------------------------

@app.route("/api/me", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    db = None
    cursor = None

    try:
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()

        if not name or not email:
            return jsonify({
                "success": False,
                "message": "Name and email are required"
            }), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM users WHERE email = %s AND id != %s",
            (email, user_id)
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "Email already in use"
            }), 409

        cursor.execute(
            """
            UPDATE users
            SET name = %s, email = %s
            WHERE id = %s
            """,
            (name, email, user_id)
        )

        db.commit()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "id": int(user_id),
                "name": name,
                "email": email
            }
        }), 200

    except Error as e:
        if db:
            db.rollback()

        print("Update Profile Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update profile"
        }), 500

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()
            
            
# ------------------------------------------------
# CHANGE CURRENT USER PASSWORD
# ------------------------------------------------

@app.route("/api/me/password", methods=["PUT"])
@jwt_required()
def change_password():

    user_id = get_jwt_identity()

    db = None
    cursor = None

    try:
        data = request.get_json() or {}

        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")
        confirm_password = data.get("confirm_password", "")

        # Required fields
        if not current_password or not new_password or not confirm_password:
            return jsonify({
                "success": False,
                "message": "All password fields are required"
            }), 400

        # New password must be at least 6 characters
        if len(new_password) < 6:
            return jsonify({
                "success": False,
                "message": "New password must be at least 6 characters"
            }), 400

        # New password and confirmation must match
        if new_password != confirm_password:
            return jsonify({
                "success": False,
                "message": "New password and confirm password do not match"
            }), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Get current hashed password
        cursor.execute(
            """
            SELECT id, password
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Verify current password
        password_correct = bcrypt.check_password_hash(
            user["password"],
            current_password
        )

        if not password_correct:
            return jsonify({
                "success": False,
                "message": "Current password is incorrect"
            }), 401

        # Hash new password
        hashed_password = bcrypt.generate_password_hash(
            new_password
        ).decode("utf-8")

        # Update password
        cursor.execute(
            """
            UPDATE users
            SET password = %s
            WHERE id = %s
            """,
            (hashed_password, user_id)
        )

        db.commit()

        return jsonify({
            "success": True,
            "message": "Password changed successfully"
        }), 200

    except Error as e:

        if db:
            db.rollback()

        print("Change Password Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to change password"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# ------------------------------------------------
# UPLOAD CURRENT USER AVATAR
# ------------------------------------------------

@app.route("/api/me/avatar", methods=["POST"])
@jwt_required()
def upload_profile_avatar():

    user_id = get_jwt_identity()

    db = None
    cursor = None
    image_path = None

    try:
        # React/Postman FormData field must be named "image"
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "message": "Profile image is required"
            }), 400

        image = request.files["image"]

        if not image.filename:
            return jsonify({
                "success": False,
                "message": "Please select an image"
            }), 400

        if not allowed_file(image.filename):
            return jsonify({
                "success": False,
                "message": "Only PNG, JPG, JPEG and WEBP images are allowed"
            }), 400

        # Generate a safe, unique filename
        safe_name = secure_filename(image.filename)
        extension = safe_name.rsplit(".", 1)[1].lower()
        unique_name = f"avatar_{user_id}_{uuid.uuid4().hex}.{extension}"

        image_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            unique_name
        )

        # Save image to existing uploads folder
        image.save(image_path)

        avatar_url = (
            f"{request.host_url.rstrip('/')}"
            f"/uploads/{unique_name}"
        )

        # Save avatar URL to logged-in user's record
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            """
            UPDATE users
            SET avatar_url = %s
            WHERE id = %s
            """,
            (avatar_url, user_id)
        )

        if cursor.rowcount == 0:
            db.rollback()

            if image_path and os.path.exists(image_path):
                os.remove(image_path)

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        db.commit()

        return jsonify({
            "success": True,
            "message": "Profile picture updated successfully",
            "avatar_url": avatar_url
        }), 200

    except (Error, OSError) as e:

        if db:
            db.rollback()

        # Avoid leaving an uploaded file behind when DB/save fails
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass

        print("Profile Avatar Upload Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to upload profile picture"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# ------------------------------------------------
# REFRESH ACCESS TOKEN
# ------------------------------------------------

@app.route("/api/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    db = None
    cursor = None
    try:
        user_id = get_jwt_identity()
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, name, email, role FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        new_access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={
                "role": user["role"],
                "name": user["name"],
                "email": user["email"]
            }
        )
        return jsonify({
            "success": True,
            "access_token": new_access_token
        }), 200
    except Error as e:
        print("Refresh Error:", e)
        return jsonify({
            "success": False,
            "message": "Unable to refresh token"
        }), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# ------------------------------------------------
# LOGOUT
# ------------------------------------------------

# ------------------------------------------------
# LOGOUT - REVOKE ACCESS TOKEN
# ------------------------------------------------

@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():

    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()

        token = get_jwt()

        jti = token["jti"]
        token_type = token["type"]

        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            """
            INSERT IGNORE INTO revoked_tokens
            (jti, token_type, user_id)
            VALUES (%s, %s, %s)
            """,
            (
                jti,
                token_type,
                int(user_id)
            )
        )

        db.commit()

        return jsonify({
            "success": True,
            "message": "Logout successful. Access token revoked."
        }), 200

    except Error as e:

        if db:
            db.rollback()

        print("Logout Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to logout"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# ------------------------------------------------
# LOGOUT - REVOKE REFRESH TOKEN
# ------------------------------------------------

@app.route("/api/logout/refresh", methods=["POST"])
@jwt_required(refresh=True)
def logout_refresh():

    db = None
    cursor = None

    try:

        # Get logged-in user's ID
        user_id = get_jwt_identity()

        # Get information from refresh JWT
        token = get_jwt()

        # Every JWT has a unique JTI
        jti = token["jti"]

        # This will be "refresh"
        token_type = token["type"]

        # Connect to MySQL
        db = get_db()
        cursor = db.cursor()

        # Save refresh token JTI in blacklist table
        cursor.execute(
            """
            INSERT IGNORE INTO revoked_tokens
            (jti, token_type, user_id)
            VALUES (%s, %s, %s)
            """,
            (
                jti,
                token_type,
                int(user_id)
            )
        )

        db.commit()

        return jsonify({
            "success": True,
            "message": "Refresh token revoked successfully"
        }), 200

    except Error as e:

        if db:
            db.rollback()

        print("Refresh Token Logout Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to revoke refresh token"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()



# =========================================
# 6. GET ALL CATEGORIES
# =========================================

@app.route("/api/categories", methods=["GET"])
def get_categories():

    db = None
    cursor = None

    try:

        # Connect to MySQL
        db = get_db()

        # Dictionary format result
        cursor = db.cursor(dictionary=True)

        # Get all categories
        cursor.execute("""
            SELECT id, name
            FROM categories
            ORDER BY name ASC
        """)

        categories = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": categories
        }), 200

    except Error as e:

        print("Categories Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch categories"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# =========================================
# 7. GET ALL PRODUCTS + SEARCH + FILTER + SORT
# =========================================

@app.route("/api/products", methods=["GET"])
def get_products():

    db = None
    cursor = None

    try:

        db = get_db()

        cursor = db.cursor(dictionary=True)

        # Get values from URL query parameters
        search = request.args.get("search", "")
        category = request.args.get("category", "")
        sort = request.args.get("sort", "")

        # Basic query
        query = """
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.category_id,
                c.name AS category_name,
                p.image_url,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE 1=1
        """

        params = []

        # --------------------------------
        # SEARCH
        # --------------------------------
        if search:

            query += """
                AND (
                    p.name LIKE %s
                    OR p.description LIKE %s
                )
            """

            search_value = f"%{search}%"

            params.append(search_value)
            params.append(search_value)

        # --------------------------------
        # CATEGORY FILTER
        # --------------------------------
        if category:

            query += " AND p.category_id = %s"

            params.append(category)

        # --------------------------------
        # SORTING
        # --------------------------------
        if sort == "price_asc":

            query += " ORDER BY p.price ASC"

        elif sort == "price_desc":

            query += " ORDER BY p.price DESC"

        elif sort == "newest":

            query += " ORDER BY p.created_at DESC"

        else:

            query += " ORDER BY p.id DESC"

        # Execute final query
        cursor.execute(
            query,
            tuple(params)
        )

        products = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": products
        }), 200

    except Error as e:

        print("Products Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch products"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# =========================================
# 8. GET SINGLE PRODUCT BY ID
# =========================================

@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):

    db = None
    cursor = None

    try:

        db = get_db()

        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.id,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.category_id,
                c.name AS category_name,
                p.image_url,
                p.created_at
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE p.id = %s
            """,
            (product_id,)
        )

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        return jsonify({
            "success": True,
            "data": product
        }), 200

    except Error as e:

        print("Product Detail Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch product"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close() 
            
# =========================================
# 9. ADMIN - ADD PRODUCT
# =========================================

@app.route("/api/products", methods=["POST"])
@jwt_required()
def add_product():

    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    db = None
    cursor = None

    try:

        data = request.get_json()

        name = data.get("name")
        description = data.get("description")
        price = data.get("price")
        stock = data.get("stock")
        category_id = data.get("category_id")
        image_url = data.get("image_url")

        # -------------------------------
        # 3. Validate required fields
        # -------------------------------
        if not name or price is None or stock is None:
            return jsonify({
                "success": False,
                "message": "Name, price and stock are required"
            }), 400

        # Basic numeric validation
        if float(price) < 0:
            return jsonify({
                "success": False,
                "message": "Price cannot be negative"
            }), 400

        if int(stock) < 0:
            return jsonify({
                "success": False,
                "message": "Stock cannot be negative"
            }), 400

        # -------------------------------
        # 4. Connect to database
        # -------------------------------
        db = get_db()
        cursor = db.cursor()

        # -------------------------------
        # 5. Insert product
        # -------------------------------
        cursor.execute(
            """
            INSERT INTO products
            (
                name,
                description,
                price,
                stock,
                category_id,
                image_url
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                name,
                description,
                price,
                stock,
                category_id,
                image_url
            )
        )

        db.commit()

        new_product_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Product added successfully",
            "product_id": new_product_id
        }), 201

    except (Error, ValueError, TypeError) as e:

        print("Add Product Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to add product"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()      
            
# =========================================
# 10. ADMIN - UPDATE PRODUCT
# =========================================

@app.route("/api/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):

    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    db = None
    cursor = None

    try:

        # --------------------------------
        # 3. Get JSON data
        # --------------------------------
        data = request.get_json()

        name = data.get("name")
        description = data.get("description")
        price = data.get("price")
        stock = data.get("stock")
        category_id = data.get("category_id")
        image_url = data.get("image_url")

        # --------------------------------
        # 4. Validate required fields
        # --------------------------------
        if not name or price is None or stock is None:

            return jsonify({
                "success": False,
                "message": "Name, price and stock are required"
            }), 400

        try:
            price_value = float(price)
            stock_value = int(stock)
        except (ValueError, TypeError):

            return jsonify({
                "success": False,
                "message": "Price and stock must be valid numbers"
            }), 400

        if price_value < 0:

            return jsonify({
                "success": False,
                "message": "Price cannot be negative"
            }), 400

        if stock_value < 0:

            return jsonify({
                "success": False,
                "message": "Stock cannot be negative"
            }), 400

        # --------------------------------
        # 5. Connect to MySQL
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)

        # --------------------------------
        # 6. Check product exists
        # --------------------------------
        cursor.execute(
            "SELECT id FROM products WHERE id = %s",
            (product_id,)
        )

        existing_product = cursor.fetchone()

        if not existing_product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        # --------------------------------
        # 7. Update product
        # --------------------------------
        cursor.execute(
            """
            UPDATE products

            SET
                name = %s,
                description = %s,
                price = %s,
                stock = %s,
                category_id = %s,
                image_url = %s

            WHERE id = %s
            """,
            (
                name,
                description,
                price_value,
                stock_value,
                category_id,
                image_url,
                product_id
            )
        )

        # --------------------------------
        # 8. Save changes
        # --------------------------------
        db.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully"
        }), 200

    except Error as e:

        print("Update Product Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update product"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()   
            
# =========================================
# 11. ADMIN - DELETE PRODUCT
# =========================================

@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):

    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    db = None
    cursor = None

    try:

        # --------------------------------
        # 3. Connect to MySQL
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)


        # --------------------------------
        # 4. Check product exists
        # --------------------------------
        cursor.execute(
            "SELECT id, name FROM products WHERE id = %s",
            (product_id,)
        )

        product = cursor.fetchone()


        if not product:

            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404


        # --------------------------------
        # 5. Delete product
        # --------------------------------
        cursor.execute(
            "DELETE FROM products WHERE id = %s",
            (product_id,)
        )


        # --------------------------------
        # 6. Save database change
        # --------------------------------
        db.commit()


        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        }), 200


    except Error as e:

        print("Delete Product Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to delete product"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()    
            
# =========================================
# 12. CUSTOMER - PLACE ORDER
# =========================================

@app.route("/api/orders", methods=["POST"])
@jwt_required()
def place_order():

    user_id = get_jwt_identity()

    db = None
    cursor = None

    try:

        # --------------------------------
        # 2. Read request data
        # --------------------------------
        data = request.get_json()

        items = data.get("items")
        address = data.get("address")


        # --------------------------------
        # 3. Basic validation
        # --------------------------------
        if not items or not isinstance(items, list):

            return jsonify({
                "success": False,
                "message": "Order items are required"
            }), 400

        if not address:

            return jsonify({
                "success": False,
                "message": "Delivery address is required"
            }), 400


        # --------------------------------
        # 4. Connect to database
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)


        # --------------------------------
        # 5. Validate ALL products first
        # --------------------------------
        validated_items = []

        total_amount = 0


        for item in items:

            product_id = item.get("product_id")
            quantity = item.get("quantity")


            if not product_id or not quantity:

                return jsonify({
                    "success": False,
                    "message": "Product ID and quantity are required"
                }), 400


            try:
                quantity = int(quantity)

            except (ValueError, TypeError):

                return jsonify({
                    "success": False,
                    "message": "Quantity must be a valid number"
                }), 400


            if quantity <= 0:

                return jsonify({
                    "success": False,
                    "message": "Quantity must be greater than zero"
                }), 400


            # Get product from database
            cursor.execute(
                """
                SELECT id, name, price, stock
                FROM products
                WHERE id = %s
                """,
                (product_id,)
            )

            product = cursor.fetchone()


            # Product does not exist
            if not product:

                return jsonify({
                    "success": False,
                    "message": f"Product ID {product_id} not found"
                }), 404


            # Check stock
            if product["stock"] < quantity:

                return jsonify({
                    "success": False,
                    "message":
                        f"Insufficient stock for {product['name']}. "
                        f"Available stock: {product['stock']}"
                }), 400


            # Calculate subtotal
            subtotal = product["price"] * quantity

            total_amount += subtotal


            # Save validated data temporarily
            validated_items.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": quantity,
                "unit_price": product["price"]
            })


        # --------------------------------
        # IMPORTANT:
        # All items are now validated.
        # Only NOW do we create order and
        # reduce stock.
        # --------------------------------


        # --------------------------------
        # 6. Create order
        # --------------------------------
        cursor.execute(
            """
            INSERT INTO orders
            (
                user_id,
                total_amount,
                address
            )
            VALUES (%s, %s, %s)
            """,
            (
                user_id,
                total_amount,
                address
            )
        )

        order_id = cursor.lastrowid


        # --------------------------------
        # 7. Add order items
        # --------------------------------
        for item in validated_items:

            cursor.execute(
                """
                INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    quantity,
                    unit_price
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    order_id,
                    item["product_id"],
                    item["quantity"],
                    item["unit_price"]
                )
            )


            # --------------------------------
            # 8. Reduce product stock
            # --------------------------------
            cursor.execute(
                """
                UPDATE products
                SET stock = stock - %s
                WHERE id = %s
                """,
                (
                    item["quantity"],
                    item["product_id"]
                )
            )


        # --------------------------------
        # 9. Save everything
        # --------------------------------
        db.commit()


        return jsonify({
            "success": True,
            "message": "Order placed successfully",
            "order_id": order_id,
            "total_amount": float(total_amount)
        }), 201


    except Error as e:

        if db:
            db.rollback()

        print("Place Order Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to place order"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()      
            
# =========================================
# 13. CUSTOMER - MY ORDERS
# =========================================

@app.route("/api/orders/my", methods=["GET"])
@jwt_required()
def my_orders():

    user_id = get_jwt_identity()

    db = None
    cursor = None

    try:

        # --------------------------------
        # 2. Connect to database
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)

        # --------------------------------
        # 3. Get orders for logged-in user
        # --------------------------------
        cursor.execute(
            """
            SELECT
                id,
                total_amount,
                status,
                address,
                ordered_at
            FROM orders
            WHERE user_id = %s
            ORDER BY ordered_at DESC
            """,
            (user_id,)
        )

        orders = cursor.fetchall()

        # --------------------------------
        # 4. Get items for every order
        # --------------------------------
        for order in orders:

            cursor.execute(
                """
                SELECT
                    oi.id,
                    oi.product_id,
                    p.name AS product_name,
                    oi.quantity,
                    oi.unit_price
                FROM order_items oi
                LEFT JOIN products p
                    ON oi.product_id = p.id
                WHERE oi.order_id = %s
                """,
                (order["id"],)
            )

            items = cursor.fetchall()

            # Attach items to this order
            order["items"] = items

        return jsonify({
            "success": True,
            "data": orders
        }), 200

    except Error as e:

        print("My Orders Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch orders"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()       
            
            
# =========================================
# TASK 18 BONUS - PROFILE ACTIVITY SUMMARY
# =========================================

@app.route("/api/me/activity", methods=["GET"])
@jwt_required()
def profile_activity():

    user_id = get_jwt_identity()

    db = None
    cursor = None

    try:

        db = get_db()

        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COUNT(id) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_spent
            FROM orders
            WHERE user_id = %s
            """,
            (user_id,)
        )

        activity = cursor.fetchone()

        return jsonify({
            "success": True,
            "activity": {
                "total_orders":
                    activity["total_orders"] or 0,

                "total_spent":
                    float(activity["total_spent"] or 0)
            }
        }), 200

    except Error as e:

        print(
            "Profile Activity Error:",
            e
        )

        return jsonify({
            "success": False,
            "message":
                "Unable to fetch profile activity"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()          
            
# =========================================
# TASK 18 BONUS - DELETE ACCOUNT
# =========================================

@app.route("/api/me", methods=["DELETE"])
@jwt_required()
def delete_account():

    user_id = get_jwt_identity()

    db = None
    cursor = None

    try:

        db = get_db()
        cursor = db.cursor()

        # Delete items belonging to user's orders
        cursor.execute(
            """
            DELETE oi
            FROM order_items oi
            INNER JOIN orders o
                ON oi.order_id = o.id
            WHERE o.user_id = %s
            """,
            (user_id,)
        )

        # Delete user's orders
        cursor.execute(
            """
            DELETE FROM orders
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # Delete old revoked JWT records
        cursor.execute(
            """
            DELETE FROM revoked_tokens
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # Finally delete user
        cursor.execute(
            """
            DELETE FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        if cursor.rowcount == 0:
            db.rollback()

            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        db.commit()

        return jsonify({
            "success": True,
            "message": "Account deleted successfully"
        }), 200

    except Error as e:

        if db:
            db.rollback()

        print("Delete Account Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to delete account"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()              
                                                         

# =========================================
# 14. ADMIN - GET ALL ORDERS
# =========================================

@app.route("/api/orders", methods=["GET"])
@jwt_required()
def get_all_orders():

    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    db = None
    cursor = None

    try:

        # --------------------------------
        # 3. Connect to database
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)

        # --------------------------------
        # 4. Get all orders with customer name
        # --------------------------------
        cursor.execute(
            """
            SELECT
                o.id,
                o.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                o.total_amount,
                o.status,
                o.address,
                o.ordered_at

            FROM orders o

            JOIN users u
                ON o.user_id = u.id

            ORDER BY o.ordered_at DESC
            """
        )

        orders = cursor.fetchall()

        # --------------------------------
        # 5. Get items for every order
        # --------------------------------
        for order in orders:

            cursor.execute(
                """
                SELECT
                    oi.product_id,
                    p.name AS product_name,
                    oi.quantity,
                    oi.unit_price

                FROM order_items oi

                LEFT JOIN products p
                    ON oi.product_id = p.id

                WHERE oi.order_id = %s
                """,
                (order["id"],)
            )

            items = cursor.fetchall()

            order["items"] = items

        return jsonify({
            "success": True,
            "data": orders
        }), 200

    except Error as e:

        print("Admin Orders Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to fetch orders"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()
            
# =========================================
# 15. ADMIN - UPDATE ORDER STATUS
# =========================================

@app.route("/api/orders/<int:order_id>/status", methods=["PUT"])
@jwt_required()
def update_order_status(order_id):

    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    db = None
    cursor = None

    try:

        # --------------------------------
        # 3. Read JSON body
        # --------------------------------
        data = request.get_json()

        status = data.get("status")

        # --------------------------------
        # 4. Allowed status values
        # --------------------------------
        allowed_statuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled"
        ]

        # --------------------------------
        # 5. Validate status
        # --------------------------------
        if not status:

            return jsonify({
                "success": False,
                "message": "Status is required"
            }), 400

        if status not in allowed_statuses:

            return jsonify({
                "success": False,
                "message": "Invalid order status"
            }), 400

        # --------------------------------
        # 6. Connect to database
        # --------------------------------
        db = get_db()

        cursor = db.cursor(dictionary=True)

        # --------------------------------
        # 7. Check order exists
        # --------------------------------
        cursor.execute(
            """
            SELECT id, status
            FROM orders
            WHERE id = %s
            """,
            (order_id,)
        )

        order = cursor.fetchone()

        if not order:

            return jsonify({
                "success": False,
                "message": "Order not found"
            }), 404

        # --------------------------------
        # 8. Update status
        # --------------------------------
        cursor.execute(
            """
            UPDATE orders
            SET status = %s
            WHERE id = %s
            """,
            (
                status,
                order_id
            )
        )

        # --------------------------------
        # 9. Save changes
        # --------------------------------
        db.commit()

        return jsonify({
            "success": True,
            "message": "Order status updated successfully",
            "order_id": order_id,
            "status": status
        }), 200

    except Error as e:

        print("Order Status Error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to update order status"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()            

# =========================================
# 16. ADMIN - UPLOAD PRODUCT IMAGE
# =========================================

@app.route("/api/upload/product-image", methods=["POST"])
@jwt_required()
def upload_product_image():


    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    # The React FormData field must be named "image".
    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "Image file is required"
        }), 400

    image = request.files["image"]

    if not image.filename:
        return jsonify({
            "success": False,
            "message": "Please select an image"
        }), 400

    if not allowed_file(image.filename):
        return jsonify({
            "success": False,
            "message": "Only PNG, JPG, JPEG and WEBP images are allowed"
        }), 400

    safe_name = secure_filename(image.filename)
    extension = safe_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{extension}"

    image_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        unique_name
    )

    try:
        image.save(image_path)
    except OSError as error:
        print("Image Upload Error:", error)
        return jsonify({
            "success": False,
            "message": "Unable to save image"
        }), 500

    image_url = (
        f"{request.host_url.rstrip('/')}"
        f"/uploads/{unique_name}"
    )

    return jsonify({
        "success": True,
        "message": "Image uploaded successfully",
        "image_url": image_url
    }), 201


# =========================================
# 17. DISPLAY UPLOADED PRODUCT IMAGE
# =========================================

@app.route("/uploads/<path:filename>", methods=["GET"])
def display_uploaded_image(filename):
    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename
    )


@app.errorhandler(413)
def image_too_large(error):
    return jsonify({
        "success": False,
        "message": "Image size must be 5 MB or less"
    }), 413


if __name__ == "__main__":
    app.run(debug=True)