# CoruñaWTF Website

Welcome to the official repository of **CoruñaWTF**, a local community in A Coruña focused on web development and design. 

## Technologies Used

This project is built using [Lume](https://lume.land/) and the [TOP](https://github.com/top-framework/top) framework.

## Installation and Usage

### Prerequisites
- [Deno](https://deno.land/) installed on your system.

### Steps to Start the Project

1. Clone this repository:  
   ```bash
   git clone https://github.com/corunawtf/web.git  
   cd web  
   ```

2. Install dependencies:  
   ```bash
   deno task lume
   ```

3. Start the development server:  
   ```bash
   deno task serve
   ```

4. Open the site in your browser at: `http://localhost:3000`.

### Generate Production Files
To build the site and generate static files in the `/docs` folder:
```bash
deno task build
```

## Contribute

If you'd like to contribute to the website's development, feel free to open an issue or submit a pull request with your suggestions.

## License

This project is distributed under the [MIT License](LICENSE).
