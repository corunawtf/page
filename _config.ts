import lume from "lume/mod.ts";
import top from "top/mod.ts";

const site = lume({
  src: "./", // Directorio de origen
  dest: "./docs", // Directorio de destino
});

site.use(top());

export default site;
