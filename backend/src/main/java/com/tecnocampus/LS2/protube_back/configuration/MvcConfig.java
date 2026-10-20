package com.tecnocampus.LS2.protube_back.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
@EnableWebMvc
public class MvcConfig implements WebMvcConfigurer {

    private static final Logger LOG =
            LoggerFactory.getLogger(MvcConfig.class);

    @Autowired
    private Environment env;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
           .addResourceHandler("/media/**")
           .addResourceLocations(
                   String.format("file:%s", env.getProperty("pro_tube.store.dir")));

        registry.addResourceHandler("/**")
           .addResourceLocations("classpath:/static/", "classpath:/public/",
                        "classpath:/resources/",
                        "classpath:/META-INF/resources/")
           .setCachePeriod(3600);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*");
        registry.addMapping("/auth/**")
                .allowedOriginPatterns("*");
    }
}
