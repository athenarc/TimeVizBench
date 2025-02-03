package gr.imsi.athenarc.visual.middleware.web.rest;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.lang.reflect.Field;

import org.reflections.Reflections;
import org.reflections.util.ConfigurationBuilder;
import org.reflections.scanners.Scanners;
import org.springframework.http.ResponseEntity;

import gr.imsi.athenarc.visual.middleware.methods.annotations.*;

@RestController
@RequestMapping("/api/method-configurations")
public class MethodConfigurationController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMethodConfigurations() {
        Map<String, Object> configurations = new HashMap<>();
        
        // Initialize Reflections using the builder pattern
        Reflections reflections = new Reflections(new ConfigurationBuilder()
            .forPackage("gr.imsi.athenarc.visual.middleware.methods")
            .setScanners(Scanners.TypesAnnotated, Scanners.SubTypes));
        
        // Find all classes annotated with @VisualMethod
        Set<Class<?>> methods = reflections.getTypesAnnotatedWith(VisualMethod.class);
        
        for (Class<?> methodClass : methods) {
            VisualMethod annotation = methodClass.getAnnotation(VisualMethod.class);
            Map<String, Object> methodConfig = new HashMap<>();
            
            Map<String, Object> initParams = new HashMap<>();
            Map<String, Object> queryParams = new HashMap<>();
            
            // Process all fields looking for @Parameter
            for (Field field : methodClass.getDeclaredFields()) {
                Parameter param = field.getAnnotation(Parameter.class);
                if (param != null) {
                    Map<String, Object> paramConfig = new HashMap<>();
                    paramConfig.put("label", param.name());
                    paramConfig.put("description", param.description());
                    paramConfig.put("type", param.type().toString().toLowerCase());
                    paramConfig.put("default", param.defaultValue());
                    
                    if (param.type() == ParameterType.NUMBER) {
                        paramConfig.put("min", param.min());
                        paramConfig.put("max", param.max());
                        paramConfig.put("step", param.step());
                    }
                    
                    if (param.isQueryParameter()) {
                        queryParams.put(field.getName(), paramConfig);
                    } else {
                        initParams.put(field.getName(), paramConfig);
                    }
                }
            }
            
            methodConfig.put("initParams", initParams);
            methodConfig.put("queryParams", queryParams);
            methodConfig.put("description", annotation.description());
            
            configurations.put(annotation.name(), methodConfig);
        }
        
        return ResponseEntity.ok(configurations);
    }
}
