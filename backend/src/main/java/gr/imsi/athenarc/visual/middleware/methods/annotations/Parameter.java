package gr.imsi.athenarc.visual.middleware.methods.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Parameter {
    String name();
    String description() default "";
    double min() default Double.NEGATIVE_INFINITY;
    double max() default Double.POSITIVE_INFINITY;
    double step() default 1.0;
    double defaultValue();
    ParameterType type() default ParameterType.NUMBER;
    boolean isQueryParameter() default false;
}


