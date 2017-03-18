package models.metrics;


import models.metrics.Metric;

public class LinesOfCode extends Metric<Integer> {

    private int loc;

    public LinesOfCode(int loc) {
        this.loc = loc;
    }

    @Override
    public Integer getValue() {
        return loc;
    }

    @Override
    public void setValue(Integer loc) {
        this.loc = loc;
    }
}