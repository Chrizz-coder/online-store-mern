# Database Design

## User

- _id
- name
- email
- phoneNumber
- password
- role
- dateOfBirth
- createdAt
- updatedAt

---

## Product

- _id
- name
- description
- price
- category
- brand
- images
- sizes
- stock
- isFeatured
- createdAt
- updatedAt

---

## Order

- _id
- userId
- items
- totalPrice
- paymentStatus
- orderStatus
- shippingAddress
- createdAt

---

## Cart

- _id
- userId
- items

Items:
- productId
- quantity
- selectedSize

---

## Wishlist

- _id
- userId
- products